import { S } from "../strings";

const LINKS = [
  { id: "privacy", href: "/privacy", label: S.legalLinks.privacy },
  { id: "terms", href: "/terms", label: S.legalLinks.terms },
  { id: "contact", href: "/contact", label: S.legalLinks.contact },
] as const;

/** 랜딩·대기실 하단의 법률·문의 링크(POL-17·19·20). 새 탭으로 열어 대기실의 미리보기 상태를 잃지 않는다. */
export function LegalFooter() {
  return (
    <footer className="shrink-0" data-testid="legal-footer">
      <nav
        aria-label={S.legalLinks.nav}
        className="flex flex-wrap items-center justify-center gap-x-1 px-4 pb-2"
      >
        {LINKS.map((l) => (
          <a
            key={l.id}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={S.legalLinks.aria(l.label)}
            data-testid={`legal-link-${l.id}`}
            className="inline-flex min-h-touch items-center px-2 text-xs text-muted underline"
          >
            {l.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
