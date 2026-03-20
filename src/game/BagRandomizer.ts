import { PieceType } from "../types";
import { ALL_PIECE_TYPES } from "./constants";

export class BagRandomizer {
  private bag: PieceType[] = [];

  next(): PieceType {
    if (this.bag.length === 0) {
      this.refill();
    }
    return this.bag.pop()!;
  }

  peek(): PieceType {
    if (this.bag.length === 0) {
      this.refill();
    }
    return this.bag[this.bag.length - 1];
  }

  private refill(): void {
    this.bag = [...ALL_PIECE_TYPES];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }
}
