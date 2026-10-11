import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * 全局错误兜底：捕获整棵 React 树渲染期的意外报错，
 * 显示友好提示而非白屏，并给出「重新加载 / 返回首页」出口。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 仅记录到控制台，便于排障；不向用户暴露技术细节
    console.error('[ErrorBoundary]', error, info)
  }

  private handleReset = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  private handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-b from-[#FFF7FB] to-[#EEF6FF] p-6">
          <div className="glass-shimmer w-full max-w-sm rounded-3xl border border-white/60 p-8 text-center shadow-xl">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
            >
              <span className="inline-block animate-[sticker-wiggle_3s_ease-in-out_infinite]">🧭</span>
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">哎呀，页面开小差了</h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
              别担心，你的足迹都还在云端。点下面的按钮重新加载，就能回到旅程中。
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                重新加载
              </button>
              <button
                onClick={this.handleHome}
                className="rounded-full border px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/50"
                style={{ borderColor: 'var(--border)' }}
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
