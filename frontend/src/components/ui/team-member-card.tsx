"use client";

/**
 * @author: @emerald-ui
 * @description: Editorial-style team member card with overlapping layers and motion
 * @version: 2.0.0
 * @date: 2026-02-19
 * @license: MIT
 * @website: https://emerald-ui.com
 */
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeamMemberCardProps {
  position?: "left" | "right";
  jobPosition?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  description?: string;
  className?: string;
}

/**
 * Editorial-style team member card with overlapping portrait, large display
 * typography, circular CTA toggle, and staggered entrance animations.
 */
export default function TeamMemberCard({
  position = "left",
  jobPosition = "Backend Engineer",
  firstName = "Jennie",
  lastName = "Garcia",
  imageUrl = "https://images.unsplash.com/photo-1526510747491-58f928ec870f?fm=jpg&q=60",
  description = "Jennie is a skilled developer with expertise in modern web technologies and a passion for creating seamless user experiences.",
  className,
}: TeamMemberCardProps) {
  const fullName = `${firstName} ${lastName}`;
  const isPositionRight = position === "right";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative my-12 flex flex-col justify-center md:my-16", className)}
    >
      {/* jobPosition label - editorial uppercase tracking */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p
          className={cn(
            "mb-4 text-xs font-medium uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500",
            isPositionRight && "text-right"
          )}
        >
          {jobPosition}
        </p>
      </motion.div>

      <div
        className={cn(
          "flex flex-col gap-6 md:flex-row md:items-center md:justify-end",
          isPositionRight && "md:justify-start"
        )}
      >
        {/* Portrait image with reveal animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative h-[26rem] w-full shrink-0 overflow-hidden rounded-sm md:h-[31.25rem] md:w-[22.5rem]",
            isPositionRight && "md:order-1"
          )}
        >
          {/* Subtle grain overlay for texture */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <img
            src={imageUrl}
            alt={fullName}
            className="h-full w-full object-cover duration-500 ease-[0.22,1,0.36,1] hover:scale-105"
          />
        </motion.div>

        {/* Info block - overlaps image via negative margin on wide screens */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative z-[2] flex flex-col gap-8 md:-left-8 md:w-[calc(100%-350px)] md:gap-14",
            isPositionRight && "md:left-8 md:items-end"
          )}
        >
          {/* Display name - large editorial type */}
          <div>
            <p className="text-4xl font-extralight leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              {firstName}
              <br />
              <span className="font-normal">{lastName}</span>
            </p>
          </div>

          {/* Details row - toggle + bio */}
          <div className={cn("flex flex-col gap-6 sm:flex-row sm:gap-8", isPositionRight && "md:justify-end")}>
            {/* Circular CTA with hover pulse */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "group flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-300 transition-colors duration-300 hover:border-zinc-600 hover:bg-zinc-900 dark:border-white/20 dark:hover:border-white/60 dark:hover:bg-white/10 sm:h-20 sm:w-20",
                isPositionRight && "md:order-1"
              )}
              aria-label={`View ${fullName}`}
            >
              <ArrowRight
                size={22}
                className={cn(
                  "text-zinc-600 transition-all duration-300 group-hover:-rotate-45 group-hover:text-white dark:text-zinc-400 dark:group-hover:text-white",
                  isPositionRight && "rotate-180 group-hover:rotate-[225deg]"
                )}
              />
            </motion.div>

            {/* Bio copy - restrained body text */}
            <div className="max-w-md md:w-[40%]">
              <p
                className={cn(
                  "text-sm leading-[1.8] text-zinc-500 dark:text-zinc-400",
                  isPositionRight && "md:text-right"
                )}
              >
                {description}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
