/**
 * Runtime Task 类型定义
 * 这是系统唯一的"测试实体"
 */

export interface RuntimeTask {
  id: string;
  intent: string;
  confidence: number;
  context: Context;
  preconditions?: Precondition[];
  steps: Step[];
  signals?: Signal[];
  outcome?: Outcome;
  metadata?: TaskMetadata;
}

export interface Context {
  changedFiles: string[];
  affectedComponents?: string[];
  affectedRoutes?: string[];
  commitHash?: string;
  component?: string;
  route?: string;
  version?: string;
}

export interface Precondition {
  type: 'auth-required' | 'data-ready' | 'service-available';
  config?: Record<string, any>;
}

export type Step =
  | NavigateStep
  | ClickStep
  | WaitStep
  | TypeStep
  | EvaluateStep
  | SelectStep
  | HoverStep;

export interface NavigateStep {
  type: 'navigate';
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface ClickStep {
  type: 'click';
  selector: string;
  timeout?: number;
}

export interface WaitStep {
  type: 'wait';
  selector: string;
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

export interface TypeStep {
  type: 'type';
  selector: string;
  value: string;
  delay?: number;
}

export interface EvaluateStep {
  type: 'evaluate';
  script: string;
  args?: any[];
}

export interface SelectStep {
  type: 'select';
  selector: string;
  value: string | string[];
}

export interface HoverStep {
  type: 'hover';
  selector: string;
}

export interface Signal {
  type: 
    | 'dom-visible'
    | 'dom-hidden'
    | 'route-match'
    | 'network-idle'
    | 'no-error-toast'
    | 'api-success'
    | 'state-match';
  selector?: string;
  value?: string;
  timeout?: number;
}

export interface Outcome {
  status: 'success' | 'failed' | 'aborted' | 'pending';
  failedStep?: number;
  reason?: 
    | 'selector-not-found'
    | 'timeout'
    | 'navigation-failed'
    | 'script-error'
    | 'unexpected-route'
    | 'signal-not-met'
    | 'precondition-failed';
  error?: string;
  duration?: number;
  screenshot?: string;
}

export interface TaskMetadata {
  createdAt?: string;
  createdBy?: 'ai' | 'rule' | 'manual';
  retryCount?: number;
}
