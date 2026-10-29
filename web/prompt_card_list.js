import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i;

// ---------------------------------------------------------------------
// One-time global stylesheet for the card UI.
// ---------------------------------------------------------------------
function injectStyles() {
    if (document.getElementById("pcl-styles")) return;
    const style = document.createElement("style");
    style.id = "pcl-styles";
    style.textContent = `
        .pcl-root {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            font-family: sans-serif;
            background: #202020;
            border-radius: 4px;
            overflow: hidden;
        }
        .pcl-controls {
            display: flex;
            gap: 4px;
            padding: 4px;
            flex-shrink: 0;
        }
        .pcl-square-btn {
            flex: 1 1 0;
            min-height: 34px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #333;
            color: #ddd;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
        }
        .pcl-square-btn:hover { background: #3d3d3d; border-color: #777; }
        .pcl-square-btn:active { background: #444; }

        .pcl-titlebar {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 2px 6px;
            flex-shrink: 0;
            border-top: 1px solid #333;
            border-bottom: 1px solid #333;
        }
        .pcl-view-btn {
            border: 1px solid #555;
            border-radius: 3px;
            background: #2a2a2a;
            color: #bbb;
            font-size: 11px;
            padding: 2px 8px;
            cursor: pointer;
        }
        .pcl-view-btn.active { background: #4a7dbd; color: #fff; border-color: #4a7dbd; }
        .pcl-view-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pcl-undo-btn { margin-left: 6px; }
        .pcl-clear-btn {
            margin-left: 4px;
            border-color: #7a3535;
            color: #f2b8b8;
        }
        .pcl-clear-btn:hover:not(:disabled) { background: #3a1f1f; border-color: #a33; }
        .pcl-clear-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pcl-size-slider { flex: 1; margin-left: 6px; }
        .pcl-count-label { font-size: 10px; color: #888; margin-left: auto; white-space: nowrap; }

        .pcl-card-area {
            flex: 1;
            overflow: auto;
            padding: 4px;
            box-sizing: border-box;
            background: #181818;
        }
        .pcl-card-area.pcl-dragover {
            outline: 2px dashed #4a7dbd;
            outline-offset: -4px;
            background: #1e2530;
        }
        .pcl-card.pcl-card-dragging {
            opacity: 0.35;
        }
        .pcl-drop-indicator {
            flex-shrink: 0;
            background: #4a7dbd;
            box-shadow: 0 0 6px #4a7dbd;
            border-radius: 2px;
            pointer-events: none;
        }
        .pcl-grid .pcl-drop-indicator {
            width: 3px;
            height: var(--card-size);
            margin: 4px 1px;
        }
        .pcl-list .pcl-drop-indicator {
            width: 100%;
            height: 3px;
            margin: 2px 0;
        }
        .pcl-card-area.pcl-grid {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            overflow-x: auto;
            overflow-y: auto;
        }
        .pcl-card-area.pcl-list {
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
            overflow-y: auto;
        }
        .pcl-empty-hint {
            width: 100%;
            text-align: center;
            color: #666;
            font-size: 12px;
            padding: 24px 8px;
            pointer-events: none;
        }

        .pcl-card {
            position: relative;
            display: flex;
            flex-direction: row;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
        }
        .pcl-grid .pcl-card {
            width: calc(var(--card-size) * 2);
            height: var(--card-size);
            margin: 4px;
        }
        .pcl-list .pcl-card {
            width: 100%;
            height: var(--card-size);
            margin-bottom: 4px;
        }

        .pcl-img-wrap {
            width: var(--card-size);
            height: 100%;
            flex-shrink: 0;
            background: #101010;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            cursor: grab;
        }
        .pcl-img-wrap:active {
            cursor: grabbing;
        }
        .pcl-img-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .pcl-no-img {
            color: #555;
            font-size: 10px;
            letter-spacing: 1px;
        }

        .pcl-prompt-box {
            flex: 1;
            height: 100%;
            resize: none;
            background: #1c1c1c;
            color: #ddd;
            border: none;
            outline: none;
            padding: 6px;
            box-sizing: border-box;
            font-size: 12px;
            font-family: inherit;
        }

        .pcl-remove-btn {
            position: absolute;
            top: 3px;
            right: 3px;
            z-index: 3;
            width: 18px;
            height: 18px;
            line-height: 16px;
            text-align: center;
            border-radius: 50%;
            border: none;
            background: #b83b3b;
            color: #fff;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            padding: 0;
        }
        .pcl-remove-btn:hover { background: #d64545; }
    `;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------
// Recursively walk a dropped DataTransferItem (file or directory).
// ---------------------------------------------------------------------
function walkEntry(entry, out) {
    return new Promise((resolve) => {
        if (!entry) { resolve(); return; }
        if (entry.isFile) {
            entry.file(
                (file) => { out.push(file); resolve(); },
                () => resolve()
            );
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const readBatch = () => {
                reader.readEntries(async (entries) => {
                    if (!entries.length) { resolve(); return; }
                    await Promise.all(entries.map((e) => walkEntry(e, out)));
                    readBatch();
                }, () => resolve());
            };
            readBatch();
        } else {
            resolve();
        }
    });
}

app.registerExtension({
    name: "PromptCardList.UI",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "PromptCardList") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            onNodeCreated?.apply(this, arguments);
            injectStyles();

            const node = this;

            // Guard against double-mounting the UI on the same node
            // instance. Without this, cloning/duplicating/pasting a node
            // can end up calling this setup twice (or ComfyUI can re-run
            // onNodeCreated after configure()), which appends a *second*
            // DOM widget stacked below the first - that's the node
            // "overflowing" past its own drawn border on copy/paste.
            if (node.pclInitialized || node.widgets?.some((w) => w.name === "pcl_ui")) {
                return;
            }
            node.pclInitialized = true;

            node.size = [440, 460];
            node.resizable = true;

            // ---- state -----------------------------------------------
            node.pclCards = []; // { id, isImage, filename, previewUrl, prompt }
            let viewMode = "grid";
            let cardSize = 140;

            // Hide the backing text widget from rendering, but keep it
            // alive so its value is still part of the serialized graph
            // / execution payload.
            const dataWidget = node.widgets?.find((w) => w.name === "card_data");
            if (dataWidget) {
                // Hide it if it's a canvas-drawn widget...
                dataWidget.computeSize = () => [0, -4];
                dataWidget.draw = () => {};

                // ...AND hide it if ComfyUI instead rendered it as a real
                // DOM element (this is what was actually happening: the
                // raw JSON was showing up as a big block of wrapped text
                // under the cards, because a DOM element ignores draw()/
                // computeSize() entirely). Cover every property name
                // different ComfyUI versions have used for this.
                for (const key of ["element", "inputEl", "textEl"]) {
                    const el = dataWidget[key];
                    if (el && el.style) {
                        el.style.display = "none";
                        el.style.pointerEvents = "none";
                    }
                }
                if (dataWidget.options?.element?.style) {
                    dataWidget.options.element.style.display = "none";
                }

                // NOTE: do NOT reset dataWidget.value here - on a cloned/
                // pasted node or a loaded workflow this already holds the
                // real saved JSON (applied by configure(), which for a
                // freshly-created node just hasn't run yet, in which case
                // this is still the Python-side default "[]"). Wiping it
                // unconditionally was silently discarding restored cards.
            }

            const syncDataWidget = () => {
                const payload = node.pclCards.map((c) => ({
                    filename: c.isImage ? c.filename : null,
                    prompt: c.prompt || "",
                }));
                if (dataWidget) {
                    dataWidget.value = JSON.stringify(payload);
                }
            };

            // ---- DOM scaffolding --------------------------------------
            const root = document.createElement("div");
            root.className = "pcl-root";

            // top control row: Add Image / Add Text
            const controlsEl = document.createElement("div");
            controlsEl.className = "pcl-controls";

            const addImageBtn = document.createElement("button");
            addImageBtn.className = "pcl-square-btn";
            addImageBtn.textContent = "+ Add Image";
            addImageBtn.title = "Click: pick image file(s). Right-click: pick a folder.";

            const addTextBtn = document.createElement("button");
            addTextBtn.className = "pcl-square-btn";
            addTextBtn.textContent = "+ Add Text";
            addTextBtn.title = "Add a blank card (prompt only, no image)";

            controlsEl.append(addImageBtn, addTextBtn);

            // title bar: view toggle + size slider
            const titleBar = document.createElement("div");
            titleBar.className = "pcl-titlebar";

            const gridBtn = document.createElement("button");
            gridBtn.className = "pcl-view-btn active";
            gridBtn.textContent = "Grid";

            const listBtn = document.createElement("button");
            listBtn.className = "pcl-view-btn";
            listBtn.textContent = "List";

            const sizeSlider = document.createElement("input");
            sizeSlider.type = "range";
            sizeSlider.min = "60";
            sizeSlider.max = "400";
            sizeSlider.value = String(cardSize);
            sizeSlider.className = "pcl-size-slider";

            const undoBtn = document.createElement("button");
            undoBtn.className = "pcl-view-btn pcl-undo-btn";
            undoBtn.textContent = "\u21B6 Undo";
            undoBtn.title = "Undo last remove / clear all";
            undoBtn.disabled = true;

            const clearAllBtn = document.createElement("button");
            clearAllBtn.className = "pcl-view-btn pcl-clear-btn";
            clearAllBtn.textContent = "Clear All";
            clearAllBtn.title = "Remove all cards";

            const countLabel = document.createElement("span");
            countLabel.className = "pcl-count-label";

            titleBar.append(gridBtn, listBtn, sizeSlider, undoBtn, clearAllBtn, countLabel);

            // scrollable card area
            const cardArea = document.createElement("div");
            cardArea.className = "pcl-card-area pcl-grid";

            root.append(controlsEl, titleBar, cardArea);

            // hidden native file inputs (files / folder)
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.multiple = true;
            fileInput.accept = "image/*";
            fileInput.style.display = "none";

            const folderInput = document.createElement("input");
            folderInput.type = "file";
            folderInput.webkitdirectory = true;
            folderInput.directory = true;
            folderInput.multiple = true;
            folderInput.style.display = "none";

            document.body.append(fileInput, folderInput);

            // ---- upload / card helpers --------------------------------
            async function uploadFile(file) {
                const body = new FormData();
                body.append("image", file);
                body.append("subfolder", "prompt_card_list");
                body.append("type", "input");
                const resp = await api.fetchApi("/upload/image", {
                    method: "POST",
                    body,
                });
                if (!resp.ok) throw new Error(`upload failed (${resp.status})`);
                const data = await resp.json();
                const subfolder = data.subfolder ? data.subfolder + "/" : "";
                return `${subfolder}${data.name}`;
            }

            async function handleFiles(files) {
                const imageFiles = files.filter(
                    (f) => (f.type && f.type.startsWith("image/")) || IMAGE_EXT_RE.test(f.name)
                );
                for (const file of imageFiles) {
                    try {
                        const filename = await uploadFile(file);
                        const previewUrl = URL.createObjectURL(file);
                        addCard({ isImage: true, filename, previewUrl, prompt: "" });
                    } catch (err) {
                        console.error("[PromptCardList] upload error:", err);
                    }
                }
            }

            // ---- undo history (for accidental remove / clear all) --------
            const HISTORY_LIMIT = 20;
            let history = [];

            function snapshotCards() {
                return node.pclCards.map((c) => ({
                    isImage: c.isImage,
                    filename: c.filename,
                    prompt: c.prompt,
                }));
            }

            function pushHistory() {
                history.push(snapshotCards());
                if (history.length > HISTORY_LIMIT) history.shift();
                undoBtn.disabled = history.length === 0;
            }

            function undo() {
                if (!history.length) return;
                const prev = history.pop();
                node.pclCards = prev.map((c) => ({
                    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    isImage: c.isImage,
                    filename: c.filename,
                    previewUrl: null, // falls back to the server /view URL in render()
                    prompt: c.prompt || "",
                }));
                undoBtn.disabled = history.length === 0;
                syncDataWidget();
                render();
            }

            function clearAll() {
                if (!node.pclCards.length) return;
                pushHistory();
                for (const c of node.pclCards) {
                    if (c.previewUrl) URL.revokeObjectURL(c.previewUrl);
                }
                node.pclCards = [];
                syncDataWidget();
                render();
            }

            function addCard(partial) {
                node.pclCards.push({
                    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    isImage: !!partial.isImage,
                    filename: partial.filename || null,
                    previewUrl: partial.previewUrl || null,
                    prompt: partial.prompt || "",
                });
                syncDataWidget();
                render();
            }

            function removeCard(id) {
                const card = node.pclCards.find((c) => c.id === id);
                if (!card) return;
                pushHistory();
                if (card.previewUrl) URL.revokeObjectURL(card.previewUrl);
                node.pclCards = node.pclCards.filter((c) => c.id !== id);
                syncDataWidget();
                render();
            }

            // ---- drag-to-reorder cards -----------------------------------
            let draggedCardId = null;
            let draggedCardEl = null;
            const dropIndicator = document.createElement("div");
            dropIndicator.className = "pcl-drop-indicator";

            function clearDropIndicator() {
                if (dropIndicator.parentElement) {
                    dropIndicator.parentElement.removeChild(dropIndicator);
                }
            }

            function placeDropIndicator(clientX, clientY) {
                const cards = Array.from(cardArea.querySelectorAll(".pcl-card")).filter(
                    (el) => el !== draggedCardEl
                );
                if (!cards.length) {
                    cardArea.appendChild(dropIndicator);
                    return;
                }
                for (const el of cards) {
                    const rect = el.getBoundingClientRect();
                    let before;
                    if (viewMode === "grid") {
                        // only consider cards in the same row as the cursor;
                        // rows can wrap so X position alone isn't enough
                        if (clientY < rect.top || clientY > rect.bottom) continue;
                        before = clientX < rect.left + rect.width / 2;
                    } else {
                        before = clientY < rect.top + rect.height / 2;
                    }
                    if (before) {
                        el.parentElement.insertBefore(dropIndicator, el);
                        return;
                    }
                }
                cardArea.appendChild(dropIndicator);
            }

            function reorderFromIndicator() {
                if (!draggedCardId || !dropIndicator.parentElement) return;

                // The dragged card element is still sitting in its original
                // DOM spot (just faded via CSS) - the indicator marks where
                // it should actually end up. Walk the DOM in order, skip the
                // dragged element, and drop its id in wherever the
                // indicator is to get the final order.
                const orderedIds = [];
                for (const el of Array.from(cardArea.children)) {
                    if (el === dropIndicator) {
                        orderedIds.push(draggedCardId);
                    } else if (el.classList?.contains("pcl-card") && el !== draggedCardEl) {
                        orderedIds.push(el.dataset.cardId);
                    }
                }

                const byId = new Map(node.pclCards.map((c) => [c.id, c]));
                const newCards = orderedIds.map((id) => byId.get(id)).filter(Boolean);
                if (newCards.length !== node.pclCards.length) return; // safety: don't corrupt the list

                node.pclCards = newCards;
                syncDataWidget();
                render();
            }

            function setViewMode(mode) {
                viewMode = mode;
                gridBtn.classList.toggle("active", mode === "grid");
                listBtn.classList.toggle("active", mode === "list");
                render();
            }

            // ---- render -------------------------------------------------
            function render() {
                applyHeight(node.size[1]);
                cardArea.classList.toggle("pcl-grid", viewMode === "grid");
                cardArea.classList.toggle("pcl-list", viewMode === "list");
                cardArea.style.setProperty("--card-size", cardSize + "px");
                cardArea.innerHTML = "";

                countLabel.textContent = `${node.pclCards.length} card${node.pclCards.length === 1 ? "" : "s"}`;

                if (!node.pclCards.length) {
                    const hint = document.createElement("div");
                    hint.className = "pcl-empty-hint";
                    hint.textContent =
                        "Drag & drop images or a folder here, or use the buttons above.";
                    cardArea.appendChild(hint);
                    return;
                }

                for (const card of node.pclCards) {
                    const cardEl = document.createElement("div");
                    cardEl.className = "pcl-card";
                    cardEl.dataset.cardId = card.id;

                    const removeBtn = document.createElement("button");
                    removeBtn.className = "pcl-remove-btn";
                    removeBtn.textContent = "\u2212"; // minus sign
                    removeBtn.title = "Remove card";
                    removeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
                    removeBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        removeCard(card.id);
                    });

                    // Only the image/thumbnail area initiates a card drag -
                    // the prompt textarea stays fully interactive (cursor
                    // placement, text selection/copy) without triggering a
                    // reorder.
                    const imgWrap = document.createElement("div");
                    imgWrap.className = "pcl-img-wrap";
                    imgWrap.draggable = true;
                    imgWrap.title = "Drag to reorder";

                    imgWrap.addEventListener("dragstart", (e) => {
                        draggedCardId = card.id;
                        draggedCardEl = cardEl;
                        cardEl.classList.add("pcl-card-dragging");
                        e.dataTransfer.effectAllowed = "move";
                        try {
                            e.dataTransfer.setData("text/plain", card.id);
                        } catch (err) {
                            /* some browsers are picky about setData - harmless if it fails */
                        }
                    });
                    imgWrap.addEventListener("dragend", () => {
                        cardEl.classList.remove("pcl-card-dragging");
                        clearDropIndicator();
                        draggedCardId = null;
                        draggedCardEl = null;
                    });

                    if (card.isImage) {
                        const img = document.createElement("img");
                        img.draggable = false; // let imgWrap (not the img) own the drag
                        const fname = (card.filename || "").split("/").pop();
                        const subfolder = card.filename && card.filename.includes("/")
                            ? card.filename.substring(0, card.filename.lastIndexOf("/"))
                            : "prompt_card_list";
                        img.src =
                            card.previewUrl ||
                            `/view?filename=${encodeURIComponent(fname)}&subfolder=${encodeURIComponent(subfolder)}&type=input`;
                        imgWrap.appendChild(img);
                    } else {
                        imgWrap.classList.add("pcl-no-img");
                        imgWrap.textContent = "TEXT";
                    }

                    const textarea = document.createElement("textarea");
                    textarea.className = "pcl-prompt-box";
                    textarea.placeholder = "Enter prompt...";
                    textarea.value = card.prompt;
                    textarea.addEventListener("pointerdown", (e) => e.stopPropagation());
                    textarea.addEventListener("input", () => {
                        card.prompt = textarea.value;
                        syncDataWidget();
                    });

                    cardEl.append(removeBtn, imgWrap, textarea);
                    cardArea.appendChild(cardEl);
                }
            }

            // ---- wire up buttons -----------------------------------------
            addImageBtn.addEventListener("click", () => fileInput.click());
            addImageBtn.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                folderInput.click();
            });
            addTextBtn.addEventListener("click", () => addCard({ isImage: false, prompt: "" }));

            fileInput.addEventListener("change", async (e) => {
                await handleFiles(Array.from(e.target.files || []));
                fileInput.value = "";
            });
            folderInput.addEventListener("change", async (e) => {
                await handleFiles(Array.from(e.target.files || []));
                folderInput.value = "";
            });

            gridBtn.addEventListener("click", () => setViewMode("grid"));
            listBtn.addEventListener("click", () => setViewMode("list"));
            undoBtn.addEventListener("click", undo);
            clearAllBtn.addEventListener("click", clearAll);
            sizeSlider.addEventListener("input", () => {
                cardSize = parseInt(sizeSlider.value, 10);
                render();
            });

            // ---- drag & drop on the card area -----------------------------
            // Two things can be dragged here: external files/folders (image
            // upload) and one of our own cards (reordering). draggedCardId
            // is only set while a card-internal drag is in progress, so we
            // branch on that rather than trying to sniff dataTransfer types.
            ["dragenter", "dragover"].forEach((evt) => {
                cardArea.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedCardId) {
                        e.dataTransfer.dropEffect = "move";
                        placeDropIndicator(e.clientX, e.clientY);
                    } else {
                        cardArea.classList.add("pcl-dragover");
                    }
                });
            });
            ["dragleave", "drop"].forEach((evt) => {
                cardArea.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cardArea.classList.remove("pcl-dragover");
                });
            });
            cardArea.addEventListener("drop", async (e) => {
                if (draggedCardId) {
                    reorderFromIndicator();
                    clearDropIndicator();
                    return;
                }
                const items = e.dataTransfer?.items;
                const files = [];
                if (items && items.length && items[0].webkitGetAsEntry) {
                    const entries = Array.from(items)
                        .map((it) => it.webkitGetAsEntry())
                        .filter(Boolean);
                    await Promise.all(entries.map((entry) => walkEntry(entry, files)));
                } else if (e.dataTransfer?.files?.length) {
                    files.push(...Array.from(e.dataTransfer.files));
                }
                await handleFiles(files);
            });

            // ---- mount as a DOM widget ------------------------------------
            const domWidget = node.addDOMWidget("pcl_ui", "div", root, {
                serialize: false,
                hideOnZoom: false,
                getMinHeight: () => 200,
            });

            // IMPORTANT: we deliberately do NOT override domWidget.computeSize
            // here. An earlier version made it read node.size live (e.g.
            // "node.size[1] - headerHeight"), and LiteGraph re-derives the
            // node's own box height from its widgets' computeSize() output
            // every frame - so that formula fed back into itself and grew
            // the node a little every frame, forever. Instead we leave
            // sizing to the default (which just measures this element's
            // actual rendered height), and keep that rendered height itself
            // bounded via plain CSS/inline-style, updated only in response
            // to real resize events below - never inside a per-frame read.
            const headerHeight = () => (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;

            function applyHeight(targetNodeHeight) {
                const h = Math.max(200, targetNodeHeight - headerHeight());
                root.style.height = h + "px";
            }

            applyHeight(node.size[1]);

            const onResize = node.onResize;
            node.onResize = function (size) {
                onResize?.apply(this, arguments);
                applyHeight(size[1]);
            };

            node.onRemoved = function () {
                fileInput.remove();
                folderInput.remove();
                for (const c of node.pclCards) {
                    if (c.previewUrl) URL.revokeObjectURL(c.previewUrl);
                }
            };

            // Nudges the canvas to redraw against the node's current
            // bounds after configure() (clone/paste/workflow load). This
            // only marks the canvas dirty - it does NOT call node.setSize,
            // which risked re-triggering the growth loop described above.
            function refreshLayout() {
                requestAnimationFrame(() => {
                    applyHeight(node.size[1]);
                    (node.setDirtyCanvas ? node.setDirtyCanvas(true, true) : app.graph.setDirtyCanvas(true, true));
                });
            }


            function restoreFromWidgetValue() {
                if (!dataWidget || !dataWidget.value || dataWidget.value === "[]") return;
                try {
                    const saved = JSON.parse(dataWidget.value);
                    if (Array.isArray(saved)) {
                        node.pclCards = saved.map((c) => ({
                            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            isImage: !!c.filename,
                            filename: c.filename || null,
                            previewUrl: null, // reconstructed from /view in render()
                            prompt: c.prompt || "",
                        }));
                    }
                } catch (e) {
                    console.warn("[PromptCardList] could not restore card_data:", e);
                }
            }

            // configure() is what actually applies a cloned/pasted node's
            // (or a loaded workflow's) saved widget values - it runs
            // *after* onNodeCreated, so this is where we need to re-sync
            // the UI's card list from the now-populated hidden widget.
            const onConfigure = node.onConfigure;
            node.onConfigure = function (info) {
                onConfigure?.apply(this, arguments);
                restoreFromWidgetValue();
                render();
                refreshLayout();
            };

            // Covers the (less common) case where the value is already
            // present by the time onNodeCreated runs.
            restoreFromWidgetValue();
            render();
            syncDataWidget();
            refreshLayout();
        };
    },
});
