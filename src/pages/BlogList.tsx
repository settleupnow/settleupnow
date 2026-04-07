import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicBlogPosts } from "@/lib/store";
import { BlogPost } from "@/lib/types";
import settleupLogo from "@/assets/settleup-logo.svg";
import { Loading3Line, ArrowRightLine } from "@mingcute/react";

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicBlogPosts().then(setPosts).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen font-sans bg-[#F5F0E8]">
      {/* Nav - simple version matching landing */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#1a1a1a] border-b border-[#333]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/">
            <img
              src={settleupLogo}
              alt="SettleUp"
              className="h-8 brightness-0 invert"
            />
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/sign-in" className="text-white text-sm font-semibold hover:text-[#1A6B3C] transition-colors">
              sign in
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <header className="mb-16 text-center max-w-2xl mx-auto">
          <p className="font-mono text-xs tracking-[0.18em] uppercase mb-4 text-[#1A6B3C]">the settleup blog</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1a1a1a] mb-6">
            insights on getting paid, <br/>building businesses.
          </h1>
          <p className="text-lg text-[#555]">
            tips, stories, and deep dives for modern freelancers and business owners.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loading3Line className="w-8 h-8 animate-spin text-[#1A6B3C]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#D8D0C4]">
            <p className="text-[#6B6560] font-mono">no posts found. check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link 
                key={post.id} 
                to={`/blog/${post.slug}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-[#D8D0C4] hover:shadow-xl hover:shadow-[#1A6B3C]/5 transition-all duration-300"
              >
                {post.cover_image_url ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={post.cover_image_url} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-[#1a1a1a] flex items-center justify-center p-8">
                     <p className="text-white/20 font-bold text-4xl select-none">SettleUp</p>
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#1A6B3C] mb-3">
                    {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <h3 className="text-xl font-bold text-[#1a1a1a] mb-3 group-hover:text-[#1A6B3C] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-[#666] line-clamp-3 mb-6 flex-1">
                    {post.excerpt || post.content.substring(0, 150).replace(/[#*`]/g, '') + "..."}
                  </p>
                  <div className="flex items-center gap-2 text-[#1A6B3C] font-semibold text-sm">
                    read article <ArrowRightLine className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-20 px-6 bg-[#1a1a1a] text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/10 pb-12 mb-12">
          <div>
            <img src={settleupLogo} alt="SettleUp" className="h-6 brightness-0 invert mb-6" />
            <p className="text-[#999] text-sm max-w-xs">
              helping freelancers get paid without the awkward follow-ups.
            </p>
          </div>
          <div className="flex gap-8">
             <Link to="/" className="text-sm hover:text-[#1A6B3C] transition-colors">home</Link>
             <Link to="/blog" className="text-sm hover:text-[#1A6B3C] transition-colors font-bold text-[#1A6B3C]">blog</Link>
             <Link to="/sign-in" className="text-sm hover:text-[#1A6B3C] transition-colors">sign in</Link>
          </div>
        </div>
        <p className="text-center font-mono text-[10px] tracking-widest text-white/40 uppercase">
          © 2026 SettleUp. your money, your move.
        </p>
      </footer>
    </div>
  );
}
