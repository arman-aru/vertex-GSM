import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: { slug: string };
}

export default async function CMSMarketingPage({ params }: PageProps) {
  const page = await prisma.cMSPage.findFirst({
    where: { slug: params.slug, published: true },
  });

  if (!page) return notFound();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="w-full py-10 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
          {page.updatedAt && (
            <p className="text-xs text-muted-foreground">Updated {page.updatedAt.toLocaleDateString()}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 prose dark:prose-invert">
        {/* Assuming page.content is HTML; if markdown, process accordingly */}
        {page.content ? (
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        ) : (
          <p className="text-sm text-muted-foreground">No content available.</p>
        )}
      </main>

      <footer className="mt-auto w-full py-10 border-t bg-background">
        <div className="mx-auto max-w-4xl px-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} GSM Theme</p>
          <Link href="/marketing" className="text-xs text-primary hover:underline">Back to Marketing</Link>
        </div>
      </footer>
    </div>
  );
}
