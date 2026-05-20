# Plan-Act-Verify Biomedical Reasoning

Role: First Author, MIDI 2025

Conference abstract PDF: https://midi2025.opi.org.pl/wp-content/uploads/2025/12/Plan-Act-Verify-An-Agentic-AI-Question-Answering-and-Reasoning-System-Evaluated-on-the-CURE-Bench-Challenge.pdf

MIDI 2025 virtual venue: https://midi2025.opi.org.pl/vr-venue/

Plan-Act-Verify Biomedical Reasoning is an agentic biomedical QA system evaluated on CURE-Bench. It answers medical reasoning problems through planning, evidence retrieval, Tool Facts, verification, and final answer synthesis.

## Tool Stack

- FDA labels
- DailyMed
- MedlinePlus
- RxNav/RxNorm
- OpenTargets
- PubChem

## Reasoning Pattern

- Plan: identify the evidence needed for a biomedical multiple-choice question.
- Act: retrieve evidence from biomedical tools and sources.
- Tool Facts: distill retrieved information into concise, source-attributed facts.
- Verify: check whether the evidence supports the selected answer.
- Final answer synthesis: produce the selected answer with grounded reasoning.

The project achieved 0.69564 hidden test accuracy on the NeurIPS CURE-Bench agentic reasoning challenge after fine-tuning and tool integration.

This is benchmark and research work, not a medical device and not medical advice.
