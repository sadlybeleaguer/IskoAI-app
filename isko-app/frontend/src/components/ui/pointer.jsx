import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion as Motion, useMotionValue } from "motion/react";

import { cn } from "@/lib/utils"

/**
 * A custom pointer component that displays an animated cursor.
 * Add this as a child to any component to enable a custom pointer when hovering.
 * You can pass custom children to render as the pointer.
 *
 * @component
 * @param {HTMLMotionProps<"div">} props - The component props
 */
export function Pointer(
  {
    className,
    style,
    children,
    ...props
  }
) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [isActive, setIsActive] = useState(false)
  const [isFinePointer, setIsFinePointer] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const pointerQuery =
      typeof window !== "undefined"
        ? window.matchMedia("(pointer: fine)")
        : null

    const updatePointerMode = () => {
      setIsFinePointer(Boolean(pointerQuery?.matches))
    }

    updatePointerMode()
    pointerQuery?.addEventListener("change", updatePointerMode)

    return () => {
      pointerQuery?.removeEventListener("change", updatePointerMode)
    }
  }, [])

  useEffect(() => {
    if (!isFinePointer) {
      return undefined
    }

    const parentElement =
      typeof window !== "undefined"
        ? (containerRef.current?.parentElement ?? null)
        : null

    const handleMouseMove = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setIsActive(true)
    }

    const handleMouseEnter = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setIsActive(true)
    }

    const handleMouseLeave = () => {
      setIsActive(false)
    }

    if (parentElement) {
      parentElement.style.cursor = "none"
      parentElement.addEventListener("mousemove", handleMouseMove)
      parentElement.addEventListener("mouseenter", handleMouseEnter)
      parentElement.addEventListener("mouseleave", handleMouseLeave)
    }

    return () => {
      if (parentElement) {
        parentElement.style.cursor = ""
        parentElement.removeEventListener("mousemove", handleMouseMove)
        parentElement.removeEventListener("mouseenter", handleMouseEnter)
        parentElement.removeEventListener("mouseleave", handleMouseLeave)
      }
    };
  }, [isFinePointer, x, y])

  if (!isFinePointer) {
    return <div ref={containerRef} />
  }

  return (
    <>
      <div ref={containerRef} />
      <AnimatePresence>
        {isActive && (
          <Motion.div
            className="pointer-events-none fixed z-50 transform-[translate(-50%,-50%)]"
            style={{
              top: y,
              left: x,
              ...style,
            }}
            initial={{
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            {...props}>
            {children || (
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="1"
                viewBox="0 0 16 16"
                height="24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                className={cn("rotate-[-70deg] stroke-white text-black", className)}>
                <path
                  d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
              </svg>
            )}
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
