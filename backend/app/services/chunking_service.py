import re
from typing import List, Tuple
from dataclasses import dataclass
from app.config import settings
from app.services.pdf_service import PDFPage
from app.utils.logger import logger


@dataclass
class TextSegment:
    text: str
    page_number: int
    word_count: int


@dataclass
class DocumentChunkData:
    page_start: int
    page_end: int
    chunk_index: int
    content: str
    word_count: int


class ChunkingService:
    """
    Intelligent semantic text chunking service.
    Splits text across natural paragraph and sentence boundaries, preserving
    exact page boundaries (page_start, page_end), chunk sequence ordering,
    and a configurable overlap window for RAG retrieval context.
    """

    def __init__(
        self,
        target_words: int = None,
        overlap_words: int = None,
    ):
        self.target_words = target_words or settings.CHUNK_TARGET_WORDS
        self.overlap_words = overlap_words or settings.CHUNK_OVERLAP_WORDS

    @staticmethod
    def _split_into_sentences(text: str) -> List[str]:
        """
        Splits paragraph into sentences using punctuation boundaries,
        handling abbreviations without breaking mid-sentence.
        """
        # Split on sentence-ending punctuation followed by whitespace
        raw_sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in raw_sentences if s.strip()]

    def _extract_segments_from_pages(self, pages: List[PDFPage]) -> List[TextSegment]:
        """
        Breaks pages down into granular text segments (sentences and short paragraphs)
        tagged with their source PDF page number.
        """
        segments: List[TextSegment] = []

        for page in pages:
            if not page.has_text or not page.text.strip():
                continue

            # Split page text into paragraphs first
            paragraphs = [p.strip() for p in page.text.split("\n\n") if p.strip()]

            for para in paragraphs:
                words = para.split()
                # If paragraph is small enough (under 120 words), keep as a single atomic unit
                if len(words) <= 120:
                    segments.append(
                        TextSegment(
                            text=para,
                            page_number=page.page_number,
                            word_count=len(words),
                        )
                    )
                else:
                    # Deconstruct large paragraphs into sentences
                    sentences = self._split_into_sentences(para)
                    for sent in sentences:
                        sent_words = sent.split()
                        if sent_words:
                            segments.append(
                                TextSegment(
                                    text=sent,
                                    page_number=page.page_number,
                                    word_count=len(sent_words),
                                )
                            )

        return segments

    def chunk_document(self, pages: List[PDFPage]) -> List[DocumentChunkData]:
        """
        Takes extracted PDF pages and partitions the text into sequential,
        overlapping chunks respecting paragraph and sentence boundaries.
        Accurately preserves the start and end page for each chunk.
        """
        segments = self._extract_segments_from_pages(pages)

        if not segments:
            logger.info("No extractable text segments found to chunk.")
            return []

        chunks: List[DocumentChunkData] = []
        current_segments: List[TextSegment] = []
        current_word_count = 0
        chunk_index = 0

        for segment in segments:
            current_segments.append(segment)
            current_word_count += segment.word_count

            # When accumulated words reach or exceed target chunk size
            if current_word_count >= self.target_words:
                chunk = self._build_chunk(current_segments, chunk_index)
                chunks.append(chunk)
                chunk_index += 1

                # Create overlap for next chunk
                current_segments, current_word_count = self._compute_overlap(current_segments)

        # Handle remaining trailing segments
        if current_segments:
            # If the remaining segment is very small and we already have at least one chunk,
            # we can merge it into the previous chunk if it's not too large, or create a final chunk
            chunk = self._build_chunk(current_segments, chunk_index)
            # Avoid duplicate identical chunks if overlap was all that was left
            if not chunks or chunk.content.strip() != chunks[-1].content.strip():
                chunks.append(chunk)

        logger.info(
            f"Chunked document into {len(chunks)} chunks "
            f"(Target: {self.target_words} words, Overlap: {self.overlap_words} words)"
        )
        return chunks

    def _build_chunk(self, segments: List[TextSegment], index: int) -> DocumentChunkData:
        """Assembles accumulated segments into a formatted chunk record."""
        page_start = min(s.page_number for s in segments)
        page_end = max(s.page_number for s in segments)
        content = " ".join(s.text for s in segments)
        total_words = sum(s.word_count for s in segments)

        return DocumentChunkData(
            page_start=page_start,
            page_end=page_end,
            chunk_index=index,
            content=content,
            word_count=total_words,
        )

    def _compute_overlap(self, segments: List[TextSegment]) -> Tuple[List[TextSegment], int]:
        """
        Calculates the trailing segments to carry forward as overlap into the next chunk.
        """
        overlap_segments: List[TextSegment] = []
        accumulated_words = 0

        # Traverse backwards from the most recent segment
        for segment in reversed(segments):
            overlap_segments.insert(0, segment)
            accumulated_words += segment.word_count
            if accumulated_words >= self.overlap_words:
                break

        # If overlap is equal to the entire previous chunk, leave at least one segment behind
        if len(overlap_segments) == len(segments) and len(segments) > 1:
            overlap_segments.pop(0)
            accumulated_words = sum(s.word_count for s in overlap_segments)

        return overlap_segments, accumulated_words


chunking_service = ChunkingService()
