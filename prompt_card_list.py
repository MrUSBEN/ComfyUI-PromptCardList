import json

import numpy as np
import torch
from PIL import Image, ImageOps

import folder_paths


class PromptCardList:
    """
    A no-input node that lets you build a list of (image, prompt) cards
    directly in the node UI (drag & drop images/folders, or add blank
    text-only cards), and outputs:

      - images: an IMAGE list, one entry per card that has an image
      - prompts: a STRING list, one entry per card (image cards AND
        text-only cards), in the order the cards appear in the UI.

    Text-only cards (no image attached) do NOT add anything to the
    image list - only to the prompt list. Because of this, the two
    output lists are not guaranteed to be the same length; "pairing"
    only holds between an image and the prompt that was typed into
    that same card.

    All UI state (filenames + prompt text, in order) is serialized by
    the frontend into the hidden `card_data` widget as a JSON string:
        [{"filename": "foo.png", "prompt": "a cat"},
         {"filename": null,      "prompt": "just some text"}, ...]
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # Populated/hidden by the JS widget - not meant to be
                # edited by hand. Kept as a normal required STRING input
                # (rather than the special "hidden" section) so its
                # value is actually serialized and sent to the backend.
                # multiline intentionally omitted/false: a multiline STRING
                # input gets rendered by ComfyUI as its own real <textarea>
                # DOM element, which ignores canvas draw()/computeSize()
                # overrides and can't be hidden that way. A plain
                # (non-multiline) STRING widget renders on canvas instead,
                # which the frontend can actually hide. This still stores
                # the full JSON string regardless of length.
                "card_data": ("STRING", {"default": "[]"}),
            },
        }

    RETURN_TYPES = ("IMAGE", "STRING", "INT")
    RETURN_NAMES = ("images", "prompts", "count")
    OUTPUT_IS_LIST = (True, True, False)
    FUNCTION = "run"
    CATEGORY = "USBEN"

    # ------------------------------------------------------------------

    @staticmethod
    def _load_image_tensor(filename):
        image_path = folder_paths.get_annotated_filepath(filename)
        img = Image.open(image_path)
        img = ImageOps.exif_transpose(img)
        if img.mode != "RGB":
            img = img.convert("RGB")
        arr = np.array(img).astype(np.float32) / 255.0
        tensor = torch.from_numpy(arr)[None, ...]  # (1, H, W, 3)
        return tensor

    def run(self, card_data="[]"):
        try:
            cards = json.loads(card_data) if card_data else []
            if not isinstance(cards, list):
                cards = []
        except Exception as e:
            print(f"[PromptCardList] Could not parse card_data JSON: {e}")
            cards = []

        images = []
        prompts = []
        count = 0

        for card in cards:
            if not isinstance(card, dict):
                continue
            filename = card.get("filename")
            prompt = card.get("prompt") or ""

            count += 1

            # Every card contributes its prompt text.
            prompts.append(prompt)

            # Only image cards contribute to the image list.
            if filename:
                try:
                    tensor = self._load_image_tensor(filename)
                    images.append(tensor)
                except Exception as e:
                    print(f"[PromptCardList] Failed to load '{filename}': {e}")

        if not images:
            # Never return a fully empty IMAGE list - downstream nodes
            # generally expect at least one image to iterate over.
            images = [torch.zeros((1, 64, 64, 3), dtype=torch.float32)]

        if not prompts:
            prompts = [""]

        return (images, prompts, count)


NODE_CLASS_MAPPINGS = {
    "PromptCardList": PromptCardList,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptCardList": "Prompt Card List",
}
