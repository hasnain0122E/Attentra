import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DOCS_CONTENT } from "@/components/docs/content";
import DocsTableOfContents from "@/components/docs/DocsTableOfContents";
import {
  DOCS_PAGES,
  adjacentDocsPages,
  docsHref,
  findDocsPage,
} from "@/lib/docs/navigation";

interface DocsPageProps {
  params: { slug?: string[] };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS_PAGES.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: DocsPageProps): Metadata {
  const page = findDocsPage(params.slug);
  if (!page) return {};
  return {
    title: page.slug.length === 0 ? "Attentra Docs" : `${page.title} — Attentra Docs`,
    description: page.description,
  };
}

export default function DocsPage({ params }: DocsPageProps) {
  const page = findDocsPage(params.slug);
  if (!page) notFound();

  const Content = DOCS_CONTENT[page.slug.join("/")];
  if (!Content) notFound();

  const { previous, next } = adjacentDocsPages(page);

  return (
    <div className="flex">
      <main id="docs-content" className="min-w-0 flex-1 px-4 pb-24 pt-10 sm:px-8 lg:px-12">
        <article className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#6E7781]">
              <li>
                <Link href="/docs" className="hover:text-white">
                  Docs
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>{page.section}</li>
              {page.slug.length > 0 && (
                <>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="text-[#A7B0BA]">
                    {page.title}
                  </li>
                </>
              )}
            </ol>
          </nav>

          <h1 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">
            {page.slug.length === 0 ? "Attentra documentation" : page.title}
          </h1>
          <p className="mt-3 text-[17px] leading-7 text-[#A7B0BA]">{page.description}</p>

          <div className="mt-10">
            <Content />
          </div>

          <nav
            aria-label="Previous and next pages"
            className="mt-16 grid gap-3 border-t border-white/[0.08] pt-8 sm:grid-cols-2"
          >
            {previous ? (
              <Link
                href={docsHref(previous)}
                className="rounded-xl border border-white/10 px-4 py-3 transition hover:border-white/25"
              >
                <span className="block text-[12px] text-[#6E7781]">← Previous</span>
                <span className="text-[15px] font-medium text-white">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={docsHref(next)}
                className="rounded-xl border border-white/10 px-4 py-3 text-right transition hover:border-white/25"
              >
                <span className="block text-[12px] text-[#6E7781]">Next →</span>
                <span className="text-[15px] font-medium text-white">{next.title}</span>
              </Link>
            )}
          </nav>
        </article>
      </main>

      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto py-10 pr-6 xl:block">
        <DocsTableOfContents headings={page.headings} />
      </aside>
    </div>
  );
}
