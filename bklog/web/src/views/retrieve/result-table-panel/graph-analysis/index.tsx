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

import { Component } from 'vue-property-decorator';
import { Component as tsc } from 'vue-tsx-support';

import './index.scss';

interface IProps {
  data: any;
}

enum OptionList {
  Analysis = 'analysis',
  Overview = 'overview',
}

enum GraphCategory {
  BAR = 'bar',
  LINE = 'line',
  LINE_BAR = 'line_bar',
  PIE = 'pie',
  TABLE = 'table',
}

@Component
export default class GraphAnalysisIndex extends tsc<IProps> {
  activeItem = OptionList.Analysis;
  axiosOptionHeight = 148;
  activeGraphCategory = GraphCategory.BAR;
  graphCategoryList = [
    GraphCategory.LINE,
    GraphCategory.BAR,
    GraphCategory.LINE_BAR,
    GraphCategory.PIE,
    GraphCategory.TABLE,
  ];

  get graphCategory() {
    return {
      [GraphCategory.LINE]: {
        icon: '',
        text: this.$t('折线图'),
        click: () => this.handleGraphCategoryClick(GraphCategory.LINE),
      },
      [GraphCategory.BAR]: {
        icon: '',
        text: this.$t('柱状图'),
        click: () => this.handleGraphCategoryClick(GraphCategory.BAR),
      },
      [GraphCategory.LINE_BAR]: {
        icon: '',
        text: this.$t('柱线图'),
        click: () => this.handleGraphCategoryClick(GraphCategory.LINE_BAR),
      },
      [GraphCategory.PIE]: {
        icon: '',
        text: this.$t('饼图'),
        click: () => this.handleGraphCategoryClick(GraphCategory.PIE),
      },
      [GraphCategory.TABLE]: {
        icon: '',
        text: this.$t('表格'),
        click: () => this.handleGraphCategoryClick(GraphCategory.TABLE),
      },
    };
  }

  get axiosStyle() {
    return {
      height: `${this.axiosOptionHeight}px`,
    };
  }

  handleGraphCategoryClick(category: GraphCategory) {
    this.activeGraphCategory = category;
  }

  renderGraphCategory() {
    return this.graphCategoryList.map(category => {
      const item = this.graphCategory[category];
      return (
        <div
          class={{ 'category-item': true, active: this.activeGraphCategory === category }}
          onClick={item.click}
        >
          <div class={['category-img', item.icon]}></div>
          <div class='category-text'>{item.text}</div>
        </div>
      );
    });
  }

  render() {
    return (
      <div class='graph-analysis-index'>
        <div class='graph-analysis-navi'>
          <div class='option-list'>
            <div class={{ active: this.activeItem === OptionList.Analysis }}>
              <span class='log-icon icon-help'></span>
              <span>分析</span>
            </div>
            <div class={{ active: this.activeItem === OptionList.Overview }}>
              <span class='log-icon icon-overview'></span>
              <span>概览</span>
            </div>
          </div>
          <div class='option-btn'>
            <bk-button
              style='margin-right: 8px;'
              outline={true}
              theme='primary'
            >
              {this.$t('保存')}
            </bk-button>
            <bk-button outline={true}>{this.$t('添加至仪表盘')}</bk-button>
          </div>
        </div>
        <div class='graph-analysis-body'>
          <div class='body-left'>
            <div
              style={this.axiosStyle}
              class='graph-axios-options'
            ></div>
            <div class='graph-canvas-options'></div>
          </div>
          <div class='body-right'>
            <div class='graph-category'>
              <div class='category-title'>{this.$t('图表样式')}</div>
              <div class='category-list'>{this.renderGraphCategory()}</div>
            </div>
            <div class='graph-info'></div>
          </div>
        </div>
      </div>
    );
  }
}
