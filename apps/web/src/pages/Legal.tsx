import { useCallback, useEffect, useRef, useState } from 'react';
import type { MetaResponse } from '@meetlite/shared';
import { TriangleAlert } from '../components/icons';
import { getMeta } from '../lib/api';
import { contactLink, parseDate, type LegalKind } from '../lib/legalMeta';
import { S, type LegalSlot } from '../strings';

export type MetaState = { status: 'loading' } | { status: 'error' } | { status: 'ok'; meta: MetaResponse };

function useMeta(): { state: MetaState; reload: () => void } {
  const [state, setState] = useState<MetaState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    void getMeta().then((res) => {
      if (alive) setState(res.ok ? { status: 'ok', meta: res.data } : { status: 'error' });
    });
    return () => {
      alive = false;
    };
  }, [attempt]);
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { state, reload };
}

const DOC_KINDS: readonly LegalKind[] = ['privacy', 'terms', 'contact'];

function Pending({ text, strong }: { text: string; strong?: boolean }) {
  return (
    <div role="status" className={`flex items-start gap-2 rounded-md border-warning bg-surface p-3 text-sm ${strong ? 'border-4' : 'border-2'}`}>
      <TriangleAlert size={strong ? 24 : 18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function ContactValue({ value }: { value: string }) {
  const link = contactLink(value);
  if (link.kind === 'mail') return <a href={link.href} className="break-all text-focus underline">{link.text}</a>;
  if (link.kind === 'web') {
    return (
      <>
        <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={S.legalLinks.aria(link.text)} className="break-all text-focus underline">
          {link.text}
        </a>{' '}
        <span className="text-muted">{S.legal.meta.newTab}</span>
      </>
    );
  }
  return <span className="break-all">{link.text}</span>;
}

function HostList({ label, hosts }: { label: string; hosts: readonly string[] }) {
  return (
    <>
      <dt className="mt-2 text-sm text-muted">{label}</dt>
      <dd>
        {hosts.length === 0 ? (
          <span className="text-muted">{S.legal.meta.none}</span>
        ) : (
          <ul className="list-disc pl-5">
            {hosts.map((h) => (
              <li key={h} className="break-all">
                {h}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </>
  );
}

function slotLabel(slot: Exclude<LegalSlot, 'networkHosts'>): string {
  return slot === 'contact' ? S.legal.labels.contact : slot === 'officer' ? S.legal.labels.officer : S.legal.labels.effectiveDate;
}

/** 운영자 정보 칸. 본문은 먼저 보이고 이 칸만 `/api/meta` 결과로 채운다(로딩·값 있음·미정·실패). */
export function MetaSlot({ slot, state, reload, strong, top }: { slot: LegalSlot; state: MetaState; reload: () => void; strong?: boolean; top?: boolean }) {
  const testId = top ? `meta-slot-top-${slot}` : `meta-slot-${slot}`;
  if (state.status === 'loading') {
    return (
      <p aria-busy="true" data-testid={testId} data-state="loading" className="my-3 text-sm text-muted">
        {S.legal.meta.loading}
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div role="status" data-testid={testId} data-state="error" className="my-3 rounded-md border border-warning bg-surface p-3 text-sm">
        <p>{S.legal.meta.error}</p>
        <button type="button" className="btn-secondary mt-2" onClick={reload} data-testid="meta-retry">
          {S.legal.meta.retry}
        </button>
      </div>
    );
  }
  const { meta } = state;
  if (slot === 'networkHosts') {
    return (
      <dl data-testid={testId} data-state="ok" className="my-3">
        <HostList label={S.legal.labels.stun} hosts={meta.network.stunHosts} />
        <HostList label={S.legal.labels.turn} hosts={meta.network.turnHosts} />
      </dl>
    );
  }
  let value: React.ReactNode;
  let pending = false;
  if (slot === 'contact') {
    if (meta.operator.contact === null) {
      pending = true;
      value = <Pending text={S.legal.meta.pending} {...(strong ? { strong } : {})} />;
    } else value = <ContactValue value={meta.operator.contact} />;
  } else if (slot === 'officer') {
    if (meta.operator.privacyOfficer === null) {
      pending = true;
      value = <Pending text={S.legal.meta.officerPending} />;
    } else value = <span className="break-all">{meta.operator.privacyOfficer}</span>;
  } else {
    const date = meta.legal.effectiveDate === null ? null : parseDate(meta.legal.effectiveDate);
    if (!date) {
      pending = true;
      value = <Pending text={S.legal.meta.datePending} />;
    } else value = <span>{S.legal.dateFormat(date.y, date.m, date.d)}</span>;
  }
  return (
    <dl data-testid={testId} data-state={pending ? 'pending' : 'ok'} className="my-3">
      <dt className="text-sm text-muted">{slotLabel(slot)}</dt>
      <dd className="mt-1">{value}</dd>
    </dl>
  );
}

/** SCR-23·24·25: 개인정보 처리방침·이용약관·문의·신고. 문구는 모두 `S.legal`(법률 검토 전 초안)에서 온다. */
export function Legal({ kind, navigate }: { kind: LegalKind; navigate: (to: string) => void }) {
  const doc = S.legal[kind];
  const { state, reload } = useMeta();
  const h1 = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    document.title = `${doc.title} · ${S.app.name}`;
    if (first.current) first.current = false;
    else h1.current?.focus();
    return () => {
      document.title = S.app.name;
    };
  }, [doc.title]);

  const go = (to: string) => (e: React.MouseEvent<HTMLAnchorElement>): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };

  return (
    <div className="min-h-full bg-bg text-text" data-testid="legal-page" data-kind={kind}>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
          <a href="/" onClick={go('/')} className="inline-flex min-h-touch items-center text-sm font-semibold underline" data-testid="legal-home">
            {S.legal.home}
          </a>
          <nav aria-label={S.legal.navLabel} className="flex flex-wrap items-center gap-x-1">
            {DOC_KINDS.map((k) => (
              <a
                key={k}
                href={`/${k}`}
                onClick={go(`/${k}`)}
                {...(k === kind ? { 'aria-current': 'page' as const } : {})}
                data-testid={`legal-nav-${k}`}
                className={`inline-flex min-h-touch items-center px-2 text-sm underline ${k === kind ? 'font-bold text-text' : 'text-muted'}`}
              >
                {S.legal[k].title}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-4 py-6 leading-7">
        {S.legal.status === 'draft' ? (
          <div data-testid="draft-ribbon" role="note" className="mb-4 rounded-md bg-warning px-3 py-2 text-sm font-semibold text-bg">
            <p className="flex items-start gap-2">
              <TriangleAlert size={18} className="mt-1 shrink-0" aria-hidden="true" />
              <span>{S.legal.draftRibbon}</span>
            </p>
            <p className="mt-1 pl-7 font-normal">{S.legal.notAdvice}</p>
          </div>
        ) : null}
        <h1 ref={h1} tabIndex={-1} className="text-2xl font-bold outline-none" data-testid="legal-title">
          {doc.title}
        </h1>
        <MetaSlot slot="effectiveDate" state={state} reload={reload} top />
        {kind === 'privacy' ? (
          <nav aria-label={S.legal.tocLabel} className="my-4" data-testid="legal-toc">
            <p className="text-sm text-muted">{S.legal.tocLabel}</p>
            <ol className="mt-1 list-decimal pl-5">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="inline-flex min-h-touch items-center text-focus underline">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {doc.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="mt-8 scroll-mt-4" data-testid={`legal-section-${s.id}`}>
            <h2 id={`${s.id}-h`} className="text-lg font-bold">
              {s.heading}
            </h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="mt-2">
                {p}
              </p>
            ))}
            {(s.slots ?? []).map((slot) => (
              <MetaSlot key={slot} slot={slot} state={state} reload={reload} strong={kind === 'contact' && s.id === 'channel'} />
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
