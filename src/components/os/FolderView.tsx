"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import { TILES } from "@/lib/home";
import { easeOut } from "@/lib/motion";
import { goBack } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";

import { AppIcon } from "./AppIcon";

const PER_PAGE = 9;

/** In edit mode the folder's name is a field; an emptied name falls back to "Folder" when it loses focus. */
function FolderName({ id, name, focus }: { id: string; name: string; focus: boolean }) {
  const [draft, setDraft] = useState(name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focus) return;
    ref.current?.focus({ preventScroll: true });
    ref.current?.select();
    useOS.setState({ renameFolder: null });
  }, [focus]);
  const save = (value: string) => {
    const { home, setHome } = useOS.getState();
    const folder = home.folders[id];
    if (folder && value && value !== folder.name) setHome({ ...home, folders: { ...home.folders, [id]: { ...folder, name: value } } });
  };
  return (
    <input
      ref={ref}
      data-edit-ui
      aria-label="Folder name"
      value={draft}
      maxLength={40}
      enterKeyHint="done"
      onChange={(e) => {
        setDraft(e.target.value);
        save(e.target.value.trim());
      }}
      onBlur={() => {
        const value = draft.trim() || "Folder";
        setDraft(value);
        save(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="mb-3 w-full truncate rounded-[12px] bg-white/15 px-3 py-1 text-[24px] font-bold tracking-tight text-white outline-none placeholder:text-white/50 focus:bg-white/25"
    />
  );
}

/** A folder: zooms out of its icon over a blurred home screen; a 3×3 grid, paged past nine. */
export function FolderView({ id, screenRef }: { id: string | null; screenRef: RefObject<HTMLDivElement | null> }) {
  const folder = useOS((s) => (id ? s.home.folders[id] : undefined));
  const wiggle = useOS((s) => s.wiggle);
  const rename = useOS((s) => !!id && s.renameFolder === id);
  const [origin, setOrigin] = useState("50% 50%");
  const [page, setPage] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = prefersReducedMotion();
  const open = !!id && !!folder;

  useLayoutEffect(() => {
    if (!open || !screenRef.current) return;
    setPage(0);
    const screen = screenRef.current.getBoundingClientRect();
    const tile = screenRef.current.querySelector(`[data-icon-tile="f:${id}"]`)?.getBoundingClientRect();
    if (tile) setOrigin(`${tile.left + tile.width / 2 - screen.left}px ${tile.top + tile.height / 2 - screen.top}px`);
  }, [open, id, screenRef]);

  useEffect(() => {
    // (A new folder's name field has already taken focus)
    if (open && !panelRef.current?.contains(document.activeElement))
      panelRef.current?.querySelector<HTMLElement>("[data-nav]")?.focus({ preventScroll: true });
  }, [open]);

  const items = folder?.items ?? [];
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const shown = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const setHomeSheet = useOS((s) => s.setHomeSheet);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="folder"
          role="dialog"
          aria-modal="true"
          aria-label={folder.name}
          data-folder={id}
          data-wiggle={wiggle || undefined}
          className="absolute inset-0 z-45 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.22, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
        >
          <button
            type="button"
            aria-label="Close folder"
            tabIndex={-1}
            onClick={goBack}
            className="absolute inset-0 bg-black/25 backdrop-blur-[18px]"
          />
          <m.div
            ref={panelRef}
            data-folder-panel
            // Edit mode: apps are arranged, not opened
            onClickCapture={(e) => {
              if (wiggle && !(e.target as Element).closest("[data-edit-ui]")) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            style={{ transformOrigin: origin } as CSSProperties}
            initial={reduce ? false : { transform: "scale(0.3)", opacity: 0 }}
            animate={{ transform: "scale(1)", opacity: 1, transition: { type: "spring", stiffness: 420, damping: 34 } }}
            exit={reduce ? { opacity: 0 } : { transform: "scale(0.3)", opacity: 0, transition: { duration: 0.2, ease: easeOut } }}
            className="relative w-[min(78%,340px)]"
          >
            {wiggle ? (
              <FolderName key={id} id={id} name={folder.name} focus={rename} />
            ) : (
              <h2 className="mb-3 truncate px-1 text-[26px] font-bold tracking-tight text-white drop-shadow">{folder.name}</h2>
            )}
            <div className="glass-dark grid grid-cols-3 content-start gap-x-3 gap-y-4 rounded-[34px] p-5 [--icon:min(62px,15.6cqw)]">
              {shown.map((tile) => {
                const item = TILES[tile];
                return item ? (
                  <div key={tile} data-folder-item={tile} className="relative flex justify-center">
                    <AppIcon item={item} />
                    {wiggle && (
                      <button
                        type="button"
                        data-edit-ui
                        aria-label={`Remove ${item.label}`}
                        onClick={() => setHomeSheet({ kind: "remove", key: tile, folder: id })}
                        className="edit-badge top-[-7px] left-[calc(50%-var(--icon)/2-7px)]"
                      >
                        <span aria-hidden />
                      </button>
                    )}
                  </div>
                ) : null;
              })}
            </div>
            {pages > 1 && (
              <div className="mt-3 flex justify-center gap-1">
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Folder page ${i + 1} of ${pages}`}
                    aria-current={page === i ? "page" : undefined}
                    onClick={() => setPage(i)}
                    className="grid size-[14px] place-items-center"
                  >
                    <span className={`size-[6px] rounded-full ${page === i ? "bg-white" : "bg-white/40"}`} />
                  </button>
                ))}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
