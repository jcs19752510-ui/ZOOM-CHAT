import { useState } from 'react';
import { normalizeNickname } from '@meetlite/shared';
import { createRoom } from '../lib/api';
import { extractRoomId } from '../lib/linkify';
import { loadNickname, saveHostClaim, saveNickname } from '../lib/storage';
import { S } from '../strings';
import { Link2 } from '../components/icons';
import { PageShell } from '../components/PageShell';

export function Landing({ navigate }: { navigate: (to: string) => void }) {
  const [nickname, setNickname] = useState(loadNickname);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nick = normalizeNickname(nickname);
    if (!nick) return setError(S.lobby.invalidNickname);
    if (usePassword && (password.length < 4 || password.length > 32)) return setError(S.landing.passwordHint);
    setError('');
    setBusy(true);
    const res = await createRoom(usePassword ? password : undefined);
    setBusy(false);
    if (!res.ok) return setError(res.code === 'RATE_LIMITED' ? S.lobby.rateLimited : S.state.error.body);
    saveNickname(nick);
    saveHostClaim(res.data.roomId, res.data.hostClaim);
    navigate(`/r/${res.data.roomId}`);
  };

  const join = (e: React.FormEvent): void => {
    e.preventDefault();
    const id = extractRoomId(link);
    if (!id) return setLinkError(S.landing.joinInvalid);
    navigate(`/r/${id}`);
  };

  return (
    <PageShell context="landing">
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col justify-center gap-8 px-4 py-4 sm:py-8 md:flex-row md:items-center md:gap-14">
      <section className="md:flex-1">
        <p className="text-sm font-bold text-focus">{S.app.name}</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{S.landing.title}</h1>
        <p className="mt-4 max-w-md text-base text-muted">{S.landing.subtitle}</p>
        <p className="mt-6 max-w-md text-xs text-muted">{S.landing.support}</p>
      </section>

      <section className="w-full rounded-lg border border-line bg-surface p-5 shadow-pop md:w-[400px]">
        <form onSubmit={(e) => void create(e)} className="flex flex-col gap-3" noValidate>
          <div>
            <label htmlFor="nickname" className="mb-1 block text-sm font-semibold">
              {S.landing.nicknameLabel}
            </label>
            <input id="nickname" data-testid="nickname" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={S.landing.nicknamePlaceholder} autoComplete="nickname" maxLength={80} aria-describedby="nickname-hint" />
            <p id="nickname-hint" className="mt-1 text-xs text-muted">
              {S.landing.nicknameHint}
            </p>
          </div>
          <div>
            <label className="flex min-h-touch items-center gap-2 text-sm">
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} className="h-5 w-5" data-testid="use-password" />
              {S.landing.passwordToggle}
            </label>
            {usePassword ? (
              <div className="mt-1">
                <label htmlFor="room-password" className="sr-only">
                  {S.landing.passwordLabel}
                </label>
                <input id="room-password" data-testid="room-password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={S.landing.passwordLabel} autoComplete="new-password" maxLength={32} aria-describedby="pw-hint" />
                <p id="pw-hint" className="mt-1 text-xs text-muted">
                  {S.landing.passwordHint}
                </p>
              </div>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-warning" data-testid="create-error">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary" disabled={busy} data-testid="create-room">
            {busy ? S.landing.creating : S.landing.createButton}
          </button>
        </form>

        <hr className="my-5 border-line" />

        <form onSubmit={join} className="flex flex-col gap-2" noValidate>
          <label htmlFor="join-link" className="text-sm font-semibold">
            {S.landing.joinTitle}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="join-link" data-testid="join-link" className="input pl-9" value={link} onChange={(e) => setLink(e.target.value)} placeholder={S.landing.joinPlaceholder} autoComplete="off" />
            </div>
            <button type="submit" className="btn-secondary" data-testid="join-by-link">
              {S.landing.joinButton}
            </button>
          </div>
          {linkError ? (
            <p role="alert" className="text-sm text-warning">
              {linkError}
            </p>
          ) : null}
        </form>
      </section>
    </main>
    </PageShell>
  );
}
