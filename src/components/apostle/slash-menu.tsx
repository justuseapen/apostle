import { useEffect, useRef } from "react";
import type { SlashSkill } from "@/lib/apostle/slash-skills";

type Props = {
  open: boolean;
  skills: SlashSkill[];
  activeIndex: number;
  onActiveIndex: (i: number) => void;
  onSelect: (skill: SlashSkill) => void;
};

/** Phosphor popover above the composer — arrow/enter/esc. */
export function SlashMenu({
  open,
  skills,
  activeIndex,
  onActiveIndex,
  onSelect,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-full z-20 mb-2 border-2 border-ph-border bg-ph-tile shadow-none"
      role="listbox"
      aria-label="Slash skills"
    >
      <div className="flex items-center justify-between border-b-2 border-ph-border px-3 py-2 font-mono text-[0.65rem] tracking-wide text-ph-dim uppercase">
        <span>Skills</span>
        <span>↑↓ enter · esc</span>
      </div>
      {skills.length === 0 ? (
        <p className="px-3 py-3 font-mono text-sm text-ph-dim">No matching skill.</p>
      ) : (
        <ul ref={listRef} className="max-h-56 overflow-y-auto py-1">
          {skills.map((skill, i) => {
            const active = i === activeIndex;
            return (
              <li key={skill.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-idx={i}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left font-mono ${
                    active
                      ? "bg-ph-focus text-ph-on"
                      : "text-ph-bone hover:bg-ph-raise"
                  }`}
                  onMouseEnter={() => onActiveIndex(i)}
                  onClick={() => onSelect(skill)}
                >
                  <span
                    className={`shrink-0 text-xs tracking-wide uppercase ${
                      active ? "text-ph-on/80" : "text-ph-tool"
                    }`}
                  >
                    /{skill.command}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{skill.label}</span>
                    <span
                      className={`mt-0.5 block text-xs leading-snug ${
                        active ? "text-ph-on/70" : "text-ph-dim"
                      }`}
                    >
                      {skill.blurb}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
