import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { ArrowRight, Calendar } from "lucide-react";

// Force static generation for SEO speed (revalidates every hour)
export const revalidate = 3600;

export const metadata = {
  title: "Gluten Free Adventures | WiseBites Blog",
  description: "Travel guides, tips, and reviews for the gluten-free community.",
};

export default async function BlogIndexPage() {
  const supabase = createClient();
  
  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, excerpt, published_at, cover_image_url")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  return (
    <div className="min-h-screen bg-white pt-12 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black text-slate-900 mb-4">COMING SOON: The WiseBites Blog</h1>
          <p className="text-lg text-slate-500">Adventures in gluten-free dining and travel.</p>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          {posts?.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 bg-white h-full flex flex-col">
                {post.cover_image_url && (
                  <div className="aspect-video bg-slate-100 overflow-hidden">
                     {/* Use Next/Image in production, simple img for now */}
                     <img 
                       src={post.cover_image_url} 
                       alt={post.title} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                     />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-green-600 mb-3 uppercase tracking-wider">
                     <Calendar className="w-3 h-3" />
                     {new Date(post.published_at).toLocaleDateString()}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-green-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-sm font-bold text-slate-900 group-hover:underline">
                    Read Article <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}