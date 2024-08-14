/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
import { Component, Prop } from 'vue-property-decorator';
import { Component as tsc } from 'vue-tsx-support';

import './index.scss';

interface IProps {
  direction: string;
}

@Component
export default class GraphDragTool extends tsc<IProps> {
  @Prop({ default: 'horizional' }) direction: string;

  startPosition = { x: 0, y: 0 };
  endPosition = { x: 0, y: 0 };
  showMoveLine = false;

  oldUserSelect = undefined;

  get moveStyle() {
    if (this.showMoveLine) {
      return {
        '--line-offset-x': `${this.endPosition.x - this.startPosition.x}px`,
        '--line-offset-y': `${this.endPosition.y - this.startPosition.y}px`,
      };
    }

    return {};
  }

  handleMousemove(e: MouseEvent) {
    Object.assign(this.endPosition, { x: e.x, y: e.y });
  }

  handleMouseup() {
    this.showMoveLine = false;

    if (this.oldUserSelect !== undefined) {
      document.body.style.setProperty('user-select', this.oldUserSelect);
      this.oldUserSelect = undefined;
    } else {
      document.body.style.removeProperty('user-select');
    }

    window.removeEventListener('mousemove', this.handleMousemove);
    window.removeEventListener('mouseup', this.handleMouseup);
    this.$emit('move-end', {
      offsetX: this.endPosition.x - this.startPosition.x,
      offsetY: this.endPosition.y - this.startPosition.y,
    });
  }

  handleMousedown(e: MouseEvent) {
    this.oldUserSelect = document.body.style.getPropertyValue('user-select');
    document.body.style.setProperty('user-select', 'none');
    Object.assign(this.startPosition, { x: e.x, y: e.y });
    Object.assign(this.endPosition, { x: e.x, y: e.y });
    this.showMoveLine = true;
    window.addEventListener('mousemove', this.handleMousemove);
    window.addEventListener('mouseup', this.handleMouseup);
  }

  render() {
    return (
      <div
        style={this.moveStyle}
        class={['graph-drag-tool', this.direction, { dragging: this.showMoveLine }]}
        onMousedown={this.handleMousedown}
      >
        <div class='drag-tool-point'>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }
}
