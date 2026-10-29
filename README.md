# ComfyUI-PromptCardList

A ComfyUI node for building a list of image and prompt cards inside the node UI, then outputting them as lists for batch workflows.

## Features

- Drag and drop images or whole folders to create cards.
- Add text-only cards for prompts without an image.
- Edit each card's prompt in place and reorder cards.
- Card order and prompt text are saved with the workflow.

## Outputs

| Output | Type | Description |
|---|---|---|
| `images` | IMAGE (list) | One entry per card that has an image |
| `prompts` | STRING (list) | One entry per card, including text-only cards |
| `count` | INT | Number of cards |

Text-only cards add to `prompts` but not `images`, so the two lists can differ in length. An image and its prompt stay paired only within the same card.

## Install

Copy this folder into `ComfyUI/custom_nodes/` and restart ComfyUI. Find the node under `USBEN > Prompt Card List`.
