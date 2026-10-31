import React from 'react'

export const PageFallback = () => {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className="min-h-[50vh] flex flex-col items-center justify-center p-8 gap-3"
    >
      <div className="w-10 h-10 border-3 border-[#C9DFCE] border-t-[#267A45] rounded-full animate-spin" />
      <span className="text-xs font-semibold text-[#526258] tracking-wide animate-pulse">
        Loading...
      </span>
    </div>
  )
}

export default PageFallback

