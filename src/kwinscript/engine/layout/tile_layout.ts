// SPDX-FileCopyrightText: 2018-2019 Eon S. Jeon <esjeon@hyunmu.am>
// SPDX-FileCopyrightText: 2021 Mikhail Zolotukhin <mail@genda.life>
//
// SPDX-License-Identifier: MIT

import { WindowsLayout } from ".";
import {
  RotateLayoutPart,
  HalfSplitLayoutPart,
  StackLayoutPart,
} from "./layout_part";

import { WindowState, EngineWindow } from "../window";

import {
  Action,
  DecreaseLayoutMasterAreaSize,
  DecreaseMasterAreaWindowCount,
  IncreaseLayoutMasterAreaSize,
  IncreaseMasterAreaWindowCount,
  Rotate,
  RotateReverse,
  RotatePart,
} from "../../controller/action";

import { clip, slide } from "../../util/func";
import { Rect, RectDelta } from "../../util/rect";
import { Config } from "../../config";
import { Controller } from "../../controller";
import { Engine } from "..";

export default class TileLayout implements WindowsLayout {
  public static readonly MIN_MASTER_RATIO = 0.2;
  public static readonly MAX_MASTER_RATIO = 0.8;
  public static readonly id = "TileLayout";
  public readonly classID = TileLayout.id;
  public readonly name = "Tile Layout";
  public readonly icon = "bismuth-tile";

  public get hint(): string {
    return String(this.numMaster);
  }

  private parts: RotateLayoutPart<
    HalfSplitLayoutPart<RotateLayoutPart<StackLayoutPart>, StackLayoutPart>
  >;

  private get numMaster(): number {
    return this.parts.inner.primarySize;
  }

  private set numMaster(value: number) {
    this.parts.inner.primarySize = value;
  }

  private get masterRatio(): number {
    return this.parts.inner.ratio;
  }

  private set masterRatio(value: number) {
    this.parts.inner.ratio = value;
  }

  private config: Config;

  constructor(config: Config) {
    this.config = config;

    this.parts = new RotateLayoutPart(
      new HalfSplitLayoutPart(
        new RotateLayoutPart(new StackLayoutPart(this.config)),
        new StackLayoutPart(this.config)
      )
    );

    const masterPart = this.parts.inner;
    masterPart.gap =
      masterPart.primary.inner.gap =
      masterPart.secondary.gap =
        this.config.tileLayoutGap;
  }

  public adjust(
    area: Rect,
    tiles: EngineWindow[],
    basis: EngineWindow,
    delta: RectDelta
  ): void {
    this.parts.adjust(area, tiles, basis, delta);
  }

  public apply(
    _controller: Controller,
    tileables: EngineWindow[],
    area: Rect
  ): void {
    tileables.forEach((tileable) => (tileable.state = WindowState.Tiled));

    this.parts.apply(area, tileables).forEach((geometry, i) => {
      tileables[i].geometry = geometry;
    });
  }

  public clone(): WindowsLayout {
    const other = new TileLayout(this.config);
    other.masterRatio = this.masterRatio;
    other.numMaster = this.numMaster;
    return other;
  }

  public executeAction(engine: Engine, action: Action): void {
    if (action instanceof DecreaseLayoutMasterAreaSize) {
      this.masterRatio = clip(
        slide(this.masterRatio, -0.05),
        TileLayout.MIN_MASTER_RATIO,
        TileLayout.MAX_MASTER_RATIO
      );
    } else if (action instanceof IncreaseLayoutMasterAreaSize) {
      this.masterRatio = clip(
        slide(this.masterRatio, +0.05),
        TileLayout.MIN_MASTER_RATIO,
        TileLayout.MAX_MASTER_RATIO
      );
    } else if (action instanceof IncreaseMasterAreaWindowCount) {
      // TODO: define arbitrary constant
      if (this.numMaster < 10) {
        this.numMaster += 1;
      }
      engine.showLayoutNotification();
    } else if (action instanceof DecreaseMasterAreaWindowCount) {
      if (this.numMaster > 0) {
        this.numMaster -= 1;
      }
      engine.showLayoutNotification();
    } else if (action instanceof Rotate) {
      this.parts.rotate(90);
    } else if (action instanceof RotateReverse) {
      this.parts.rotate(-90);
    } else if (action instanceof RotatePart) {
      this.parts.inner.primary.rotate(90);
    } else {
      action.executeWithoutLayoutOverride();
    }
  }

  public toString(): string {
    return `TileLayout(nmaster=${this.numMaster}, ratio=${this.masterRatio})`;
  }
}
