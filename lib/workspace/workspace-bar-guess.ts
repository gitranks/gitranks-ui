import { isAsVisitor } from './contribute-state';
import type { WorkspaceTab } from './gate';
import { isSharedSettingsPath, LAST_BAR_COOKIE, lastBarInCookies } from './settings-bar';
import { activeTabOf } from './workspace-tabs';
import { hasSessionHint, SESSION_HINT_COOKIE } from '@/lib/session-hint';

/*
 * The workspace's bar keeps its place from the first paint. The bar is read per request, after the page's shell, which
 * is the same for everyone; so the shell draws the four tab names in the bar's place (`WorkspaceBarFallback`), shown
 * only when the browser guesses the page will draw the tabs. The guess reads two cookies the site already sets, in the
 * browser alone: the session hint (`has-session`) and the bar seen last (`gr_last_bar`). No server code reads a cookie
 * for it, so the shell stays prerendered.
 */

/**
 * The attributes set on `<html>`: `data-bar-guess` when the page will most likely draw the workspace's tabs, and
 * `data-bar-guess-tab` naming the current one, left out when none is.
 */
export const BAR_GUESS_ATTRIBUTES = { shown: 'data-bar-guess', tab: 'data-bar-guess-tab' } as const;

/** The guess: the tabs will show, with this tab current (null for none); null when they most likely will not. */
export type WorkspaceBarGuess = { tab: WorkspaceTab | null } | null;

/** The pages under `/my` that draw no bar of their own: a pull request's Approve and its walkthrough, in the player. */
const PLAYER_PAGE = /^\/my\/pull-requests\/[^/]+\/[^/]+\/[^/]+\/(?:approve|walkthrough)\/?$/;

/**
 * Whether the page draws the workspace's tabs for someone who has entered and saw them last: every page under `/my`
 * but Settings opened from Learn (Learn's bar shows there) and the player's pages; `/contribute`, but not as a visitor
 * would see it (`?as=visitor`); and a fair-use message's answer page.
 */
function drawsTabs(pathname: string, search: URLSearchParams): boolean {
  if (/^\/my(?:\/|$)/.test(pathname)) {
    if (PLAYER_PAGE.test(pathname)) return false;
    return !(isSharedSettingsPath(pathname) && search.get('from') === 'learn');
  }
  if (/^\/contribute\/?$/.test(pathname)) return !isAsVisitor(search.get('as'));
  return /^\/contribute\/answer\/[^/]+\/?$/.test(pathname);
}

/**
 * Whether this page will most likely draw the workspace's four tabs, and which of them is current (`activeTabOf`'s
 * rule). Yes only when the browser holds a session, the bar seen last is the workspace's (it is written only where the
 * tabs were drawn, so only for someone who has entered; Learn's bar writes `learn` for everyone, visitors included),
 * and the address draws the tabs. A wrong yes closes the reserved line when the bar arrives; a wrong no moves the page
 * as it did before, so the guess errs towards reserving nothing.
 */
export function workspaceBarGuessOf(pathname: string, search: URLSearchParams, cookies: string): WorkspaceBarGuess {
  if (!hasSessionHint(cookies) || lastBarInCookies(cookies) !== 'contribute') return null;
  if (!drawsTabs(pathname, search)) return null;
  return { tab: activeTabOf(pathname, search) };
}

/** Sets the guess's attributes on the page's root, or takes them away. */
export function markBarGuess(root: Element, guess: WorkspaceBarGuess): void {
  root.toggleAttribute(BAR_GUESS_ATTRIBUTES.shown, !!guess);
  if (guess?.tab) root.setAttribute(BAR_GUESS_ATTRIBUTES.tab, guess.tab);
  else root.removeAttribute(BAR_GUESS_ATTRIBUTES.tab);
}

/**
 * The guess as an inline script for the head, run before the first paint on the first load: `workspaceBarGuessOf` and
 * `markBarGuess` written out in plain ES5, from `location` and `document.cookie`. It never throws. The spec beside it
 * runs it on every address the helper is specified on and holds the two to the same answers.
 */
export const BAR_GUESS_SCRIPT = `try{(function(){var c=document.cookie.split(';'),s=false,b=null,i,p,n;for(i=0;i<c.length;i++){p=c[i].replace(/^\\s+|\\s+$/g,'');n=p.split('=');if(p.indexOf(${JSON.stringify(`${SESSION_HINT_COOKIE}=`)})===0)s=true;if(b===null&&n[0]===${JSON.stringify(LAST_BAR_COOKIE)})b=n[1]||''}if(!s||b!=='contribute')return;var h=location.pathname,q=new URLSearchParams(location.search),y=false;if(/^\\/my(?:\\/|$)/.test(h))y=!${PLAYER_PAGE}.test(h)&&!(/^\\/my\\/settings(?:\\/|$)/.test(h)&&q.get('from')==='learn');else if(/^\\/contribute\\/?$/.test(h))y=q.get('as')!=='visitor';else y=/^\\/contribute\\/answer\\/[^\\/]+\\/?$/.test(h);if(!y)return;var t=null,a=h.replace(/\\/+$/,'')||'/',u=function(x){return a===x||a.indexOf(x+'/')===0};if(a.indexOf('/my/start/')===0)t=q.get('lesson')==='1'?null:'contribute';else if(a==='/contribute')t='contribute';else if(u('/my/pull-requests'))t='pull-requests';else if(u('/my/agent'))t='agent';else if(u('/my/settings'))t='settings';var r=document.documentElement;r.setAttribute(${JSON.stringify(BAR_GUESS_ATTRIBUTES.shown)},'');if(t)r.setAttribute(${JSON.stringify(BAR_GUESS_ATTRIBUTES.tab)},t)})()}catch(e){}`;
