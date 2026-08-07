/* Copyright 2026 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  AnnotationEditorParamsType,
  AnnotationEditorType,
  shadow,
} from "../../shared/util.js";
import { InkDrawingOptions, InkEditor } from "./ink.js";
import { AnnotationEditor } from "./editor.js";
import { InkDrawOutliner } from "./drawers/inkdraw.js";

// The highlighter: the ink drawing pipeline styled as a free highlight —
// a multiply-blended pastel stroke with its own preset defaults. It replaces
// the textLayer-driven highlight tool for stroke creation: one robust gesture
// path (DrawingEditor sessions) for mouse, touch and pen alike. Strokes
// serialize as Ink annotations plus a `highlighter` flag, so saving needs no
// core changes and peers restore the multiply styling from the flag.

class HighlighterDrawingOptions extends InkDrawingOptions {
  constructor(viewerParameters) {
    super(viewerParameters);
    super.updateProperties({
      // Free-highlight default look: pastel yellow at full opacity — the
      // multiply blend is what keeps the text readable underneath. Square
      // (projecting) caps give the band a square head and tail that extend
      // half the band width past the drag's end points: the finished line
      // covers exactly what the app's centered square cursor covered.
      stroke: "#FFFF98",
      "stroke-width": 12,
      "stroke-linecap": "square",
    });
  }

  clone() {
    const clone = new HighlighterDrawingOptions(this._viewParameters);
    clone.updateAll(this);
    return clone;
  }
}

class HighlighterEditor extends InkEditor {
  static _type = "highlighter";

  static _editorType = AnnotationEditorType.HIGHLIGHTER;

  static _defaultDrawingOptions = null;

  /** @inheritdoc */
  static initialize(l10n, uiManager) {
    AnnotationEditor.initialize(l10n, uiManager);
    this._defaultDrawingOptions = new HighlighterDrawingOptions(
      uiManager.viewParameters
    );
  }

  /** @inheritdoc */
  static get typesMap() {
    return shadow(
      this,
      "typesMap",
      new Map([
        [AnnotationEditorParamsType.HIGHLIGHTER_THICKNESS, "stroke-width"],
        [AnnotationEditorParamsType.HIGHLIGHTER_COLOR, "stroke"],
      ])
    );
  }

  /** @inheritdoc */
  static createDrawerInstance(x, y, parentWidth, parentHeight, rotation) {
    // The band is centered on the pointer (like the ink stroke), matching
    // the centered square cursor and the screen-share overlay highlighter
    const drawer = new InkDrawOutliner(
      x,
      y,
      parentWidth,
      parentHeight,
      rotation,
      this._defaultDrawingOptions["stroke-width"]
    );
    drawer.isHighlighter = true;
    return drawer;
  }

  /** @inheritdoc */
  static deserializeDraw(pageX, pageY, pageWidth, pageHeight, innerMargin, data) {
    const outlines = super.deserializeDraw(
      pageX,
      pageY,
      pageWidth,
      pageHeight,
      innerMargin,
      data
    );
    outlines.isHighlighter = true;
    return outlines;
  }

  /**
   * Foreign param types (INK_*, HIGHLIGHT_*) must not leak into the
   * highlighter presets: default-param updates broadcast to every registered
   * editor type, and InkEditor's INK_COLOR_AND_OPACITY special case bypasses
   * the typesMap gate.
   */
  updateParams(type, value) {
    if (!this.constructor.typesMap.has(type)) {
      return;
    }
    super.updateParams(type, value);
  }

  /** @inheritdoc */
  static updateDefaultParams(type, value) {
    if (!this.typesMap.has(type)) {
      return;
    }
    super.updateDefaultParams(type, value);
  }

  get colorType() {
    return AnnotationEditorParamsType.HIGHLIGHTER_COLOR;
  }

  /** @inheritdoc */
  get toolbarButtons() {
    // No mini color picker: color/thickness live in the app's params bar
    // (the ink picker would dispatch INK_* types at the wrong tool)
    return [];
  }

  /** @inheritdoc */
  serialize(isForCopying = false) {
    const serialized = super.serialize(isForCopying);
    if (!serialized) {
      return null;
    }
    // Interop: an Ink annotation for the PDF writer and for older peers,
    // plus a flag so deserialization restores the highlighter styling
    serialized.annotationType = AnnotationEditorType.INK;
    serialized.highlighter = true;
    return serialized;
  }
}

export { HighlighterEditor };
