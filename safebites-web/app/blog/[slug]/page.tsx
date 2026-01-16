import { createClient } from "../../../utils/supabase/client";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { ChevronLeft, Calendar, User } from "lucide-react";
import { Metadata } from "next";

// 1. Generate SEO Metadata Dynamically
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: post } = await supabase.from("posts").select("*").eq("slug", params.slug).single();
  
  if (!post) return { title: "Article Not Found" };

  return {
    title: `${post.title} | WiseBites`,
    description: post.excerpt,
    openGraph: {
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  };
}

// 2. The Page Component
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!post) return notFound();

  return (
    <article className="min-h-screen bg-white pb-24">
      {/* Header Image */}
      {post.cover_image_url ? (
        <div className="w-full h-[40vh] relative">
            <div className="absolute inset-0 bg-black/40" />
            <img src={post.cover_image_url} className="w-full h-full object-cover" alt={post.title} />
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 text-white max-w-4xl mx-auto">
                 <Link href="/blog" className="inline-flex items-center text-sm font-bold text-white/80 hover:text-white mb-6 hover:underline">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back to Blog
                </Link>
                <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">{post.title}</h1>
                <div className="flex items-center gap-6 text-sm font-medium text-white/90">
                    <span className="flex items-center gap-2"><User className="w-4 h-4" /> {post.author}</span>
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(post.published_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
      ) : (
        <div className="pt-12 px-6 max-w-3xl mx-auto mb-10">
            <Link href="/blog" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-green-600 mb-6">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Blog
            </Link>
            <h1 className="text-4xl font-black text-slate-900 mb-4">{post.title}</h1>
        </div>
      )}

      {/* Content Body */}
      <div className="max-w-3xl mx-auto px-6 mt-12">
        <div className="prose prose-lg prose-slate prose-headings:font-bold prose-a:text-green-600 hover:prose-a:text-green-700">
            <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* The CTA at the bottom */}
        <div className="mt-16 bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Eat safely anywhere.</h3>
            <p className="text-slate-600 mb-6">Download WiseBites to find the dedicated gluten-free spots mentioned in this article.</p>
            <Link href="/signup" className="inline-block bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-600 transition-colors shadow-lg">
                Get the App Free
            </Link>
        </div>
      </div>
    </article>
  );
}