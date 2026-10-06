'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAppearance } from '../../context/AppearanceContext';
import { AppIcon } from '../AppIcons';
import { Icon } from '../Icons';
import { BrandMark } from '../Brand';
import { Wallpaper } from '../Wallpapers';
import {
  THEMES, WALLPAPERS, ICON_PACKS, PRESETS, SHORTCUTS, MAX_SHORTCUTS,
  findWallpaper, findPack, themeName, type ShortcutDef,
} from '../../lib/appearance';

/** A few icons, enough to judge an icon pack or a look by. */
const SAMPLE = ['sales', 'pnl', 'zakat', 'tasks', 'landed', 'charity'];

function MiniTiles({ count = 6 }: { count?: number }) {
  return (
    <div className="ap-tiles">
      {SAMPLE.slice(0, count).map((n) => (
        <span key={n} className="tile-ic">
          <AppIcon name={n} />
        </span>
      ))}
    </div>
  );
}

/** Appearance: themes, wallpapers and icon packs that are made to match, plus the home shortcuts. */
export function AppearancePage() {
  const { look, update, surprise, undo, canUndo, reset } = useAppearance();
  const { denied, toast, goto } = useApp();
  const wall = findWallpaper(look.wallpaper);
  const themeKey = look.theme + (look.uniqueName || '');

  const chosen = look.shortcuts
    .map((id) => SHORTCUTS.find((s) => s.id === id))
    .filter((s): s is ShortcutDef => !!s && !denied(s.need));
  const available = SHORTCUTS.filter((s) => !look.shortcuts.includes(s.id) && !denied(s.need));
  const move = (id: string, by: number) => {
    const list = look.shortcuts.slice();
    const i = list.indexOf(id), j = i + by;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    update({ shortcuts: list });
  };

  const presetOn = (p: (typeof PRESETS)[number]) => look.theme === p.theme && look.wallpaper === p.wallpaper && look.icons === p.icons;

  return (
    <div className="page ap">
      <div className="ap-head">
        <div>
          <h1>Appearance</h1>
          <p>Pick a theme, a wallpaper and an icon pack — each one is made to go with the others.</p>
        </div>
        <div className="ap-head-acts">
          <button type="button" className="btn" onClick={undo} disabled={!canUndo}>
            <Icon name="undo" /> Undo
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              reset();
              toast('Back to the A&Sons company look');
            }}
          >
            Company look
          </button>
          <button type="button" className="btn pri" onClick={() => goto('dashboard/home')}>
            See it on Home
          </button>
        </div>
      </div>

      {/* THE LOOK NOW, AND THE DICE */}
      <section className="ap-hero">
        <div className="ap-preview" data-tone={wall.tone}>
          <Wallpaper id={look.wallpaper} seed={look.seed} themeKey={themeKey} />
          <div className="ap-prev-nav">
            <span className="ap-prev-logo">
              <BrandMark size={18} />
            </span>
            <b>A &amp; Sons Tradeway</b>
          </div>
          <div className="ap-prev-body">
            <div className="ap-prev-sc">
              {(chosen.length ? chosen : SHORTCUTS.slice(0, 3)).slice(0, 3).map((s, i) => (
                <span key={s.id} className={`ap-prev-chip sc-v${i % 3}`}>
                  <span className="sc-ic">
                    <AppIcon name={s.icon} size={18} />
                  </span>
                  {s.label}
                </span>
              ))}
            </div>
            <div className="ap-prev-icons">
              {SAMPLE.map((n, i) => (
                <span key={n} className="ap-prev-tile">
                  <span className="tile-ic">
                    <AppIcon name={n} />
                  </span>
                  <span className="tile-l">{['Sales', 'Profit', 'Zakat', 'Tasks', 'Cost Sheets', 'Charity'][i]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="ap-now">
          <span className="kicker">Your look</span>
          <h2>{themeName(look)}</h2>
          <dl>
            <div>
              <dt>Wallpaper</dt>
              <dd>{wall.name}</dd>
            </div>
            <div>
              <dt>Icons</dt>
              <dd>{findPack(look.icons).name}</dd>
            </div>
          </dl>
          <button type="button" className="ap-dice" onClick={surprise}>
            <span className="ap-dice-ic">
              <Icon name="dice" size={26} />
            </span>
            <span>
              <b>Surprise me</b>
              <small>A new theme, wallpaper and icon pack that go together — sometimes a colour nobody else has.</small>
            </span>
          </button>
          {canUndo && (
            <button type="button" className="linkbtn" onClick={undo}>
              Liked the one before? Go back
            </button>
          )}
        </div>
      </section>

      {/* READY-MADE LOOKS */}
      <section className="ap-sec">
        <h3>Ready-made looks</h3>
        <p className="ap-sub">Combinations put together by hand. One click sets all three.</p>
        <div className="ap-grid looks">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`ap-card ap-look ${presetOn(p) ? 'on' : ''}`}
              aria-pressed={presetOn(p)}
              onClick={() => update({ theme: p.theme, wallpaper: p.wallpaper, icons: p.icons })}
            >
              <span className="ap-look-art" data-theme={p.theme} data-icons={p.icons} data-tone={findWallpaper(p.wallpaper).tone}>
                <Wallpaper id={p.wallpaper} seed={11} still />
                <span className="ap-look-nav" />
                <MiniTiles count={4} />
              </span>
              <span className="ap-card-t">
                <b>{p.name}</b>
                <small>{p.note}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* THEMES */}
      <section className="ap-sec">
        <h3>Theme</h3>
        <p className="ap-sub">The colours of the top bar, buttons and links. Wallpapers and icons follow it.</p>
        <div className="ap-grid themes">
          {look.theme === 'unique' && (
            <div className="ap-card ap-theme on" aria-current="true">
              <span className="ap-swatch unique">
                <i style={{ background: look.vars?.['--brand'] }} />
                <i style={{ background: look.vars?.['--hl'] }} />
                <i style={{ background: look.vars?.['--brand-wash'] }} />
              </span>
              <span className="ap-card-t">
                <b>{look.uniqueName}</b>
                <small>Made for you by Surprise me</small>
              </span>
            </div>
          )}
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ap-card ap-theme ${look.theme === t.id ? 'on' : ''}`}
              aria-pressed={look.theme === t.id}
              onClick={() => update({ theme: t.id })}
            >
              <span className="ap-swatch">
                <i style={{ background: t.swatch[0] }} />
                <i style={{ background: t.swatch[1] }} />
                <i style={{ background: t.swatch[2] }} />
              </span>
              <span className="ap-card-t">
                <b>{t.name}</b>
                <small>{t.note}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* WALLPAPERS */}
      <section className="ap-sec">
        <h3>Wallpaper</h3>
        <p className="ap-sub">Behind the icons on Home, drawn in your theme’s colours.</p>
        <div className="ap-grid walls">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`ap-card ap-wall ${look.wallpaper === w.id ? 'on' : ''}`}
              aria-pressed={look.wallpaper === w.id}
              onClick={() => update({ wallpaper: w.id })}
            >
              <span className="ap-wall-art">
                <Wallpaper id={w.id} seed={look.seed} still />
              </span>
              <span className="ap-card-t">
                <b>
                  {w.name}
                  {w.tone === 'dark' && <em className="ap-tag">Dark</em>}
                </b>
                <small>{w.note}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ICON PACKS */}
      <section className="ap-sec">
        <h3>Icon pack</h3>
        <p className="ap-sub">The same icons, finished differently. Shown on your wallpaper.</p>
        <div className="ap-grid packs">
          {ICON_PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`ap-card ap-pack ${look.icons === p.id ? 'on' : ''}`}
              aria-pressed={look.icons === p.id}
              onClick={() => update({ icons: p.id })}
            >
              <span className="ap-pack-art" data-icons={p.id} data-tone={wall.tone}>
                <Wallpaper id={look.wallpaper} seed={look.seed} still />
                <MiniTiles count={5} />
              </span>
              <span className="ap-card-t">
                <b>{p.name}</b>
                <small>{p.note}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* SHORTCUTS */}
      <section className="ap-sec">
        <h3>Shortcuts on Home</h3>
        <p className="ap-sub">
          The big buttons on top of the home screen. Choose up to {MAX_SHORTCUTS}, in the order you want them.
        </p>
        <div className="ap-sc">
          <div className="panel">
            <div className="panel-h">
              <h3>On Home</h3>
              <span className="sub">
                {chosen.length} of {MAX_SHORTCUTS}
              </span>
            </div>
            <div className="panel-b tight">
              {chosen.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No shortcuts — Home starts with the icons. Add one from the list.
                </p>
              ) : (
                <ol className="ap-sc-list">
                  {chosen.map((s, i) => (
                    <li key={s.id}>
                      <span className={`ap-sc-badge sc-v${i % 3}`}>
                        <span className="sc-ic">
                          <AppIcon name={s.icon} size={22} />
                        </span>
                      </span>
                      <span className="ap-sc-t">
                        <b>{s.label}</b>
                        <small>{s.sub}</small>
                      </span>
                      <button type="button" className="iconbtn" aria-label={`Move ${s.label} up`} disabled={i === 0} onClick={() => move(s.id, -1)}>
                        <Icon name="move-up" />
                      </button>
                      <button type="button" className="iconbtn" aria-label={`Move ${s.label} down`} disabled={i === chosen.length - 1} onClick={() => move(s.id, 1)}>
                        <Icon name="move-down" />
                      </button>
                      <button
                        type="button"
                        className="iconbtn"
                        aria-label={`Remove ${s.label}`}
                        onClick={() => update({ shortcuts: look.shortcuts.filter((x) => x !== s.id) })}
                      >
                        <Icon name="x" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-h">
              <h3>Add a shortcut</h3>
            </div>
            <div className="panel-b tight">
              <div className="ap-sc-add">
                {available.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="sc-pick"
                    disabled={chosen.length >= MAX_SHORTCUTS}
                    onClick={() => update({ shortcuts: [...look.shortcuts, s.id] })}
                  >
                    <span className="sc-ic">
                      <AppIcon name={s.icon} size={22} />
                    </span>
                    <span>
                      <b>{s.label}</b>
                      <small>{s.sub}</small>
                    </span>
                    <Icon name="plus" />
                  </button>
                ))}
              </div>
              {chosen.length >= MAX_SHORTCUTS && (
                <p className="muted" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
                  Home has {MAX_SHORTCUTS} shortcuts — remove one to add another.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
