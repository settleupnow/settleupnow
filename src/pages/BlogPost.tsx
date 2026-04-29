import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPublicBlogPost } from "@/lib/store";
import { BlogPost as IBlogPost } from "@/lib/types";
import settleupLogo from "@/assets/settleup-logo.svg";
import { Loading3Line, ArrowLeftLine, Share2Line } from "@mingcute/react";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<IBlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      getPublicBlogPost(slug).then(setPost).finally(() => setLoading(false));
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
        <Loading3Line className="w-8 h-8 animate-spin text-[#1A6B3C]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F0E8] p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Post not found.</h1>
        <Link to="/blog" className="text-[#1A6B3C] font-semibold flex items-center gap-2">
          <ArrowLeftLine className="w-4 h-4" /> back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-[#F5F0E8] selection:bg-[#1A6B3C] selection:text-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#1a1a1a] border-b border-[#333]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/">
            <img
              src={settleupLogo}
              alt="SettleUp"
              className="h-8 brightness-0 invert"
            />
          </Link>
          <Link to="/blog" className="text-white text-sm font-semibold hover:text-[#1A6B3C] transition-colors flex items-center gap-2">
            <ArrowLeftLine className="w-4 h-4" /> back to blog
          </Link>
        </div>
      </nav>

      <article className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <header className="mb-12">
          <p className="font-mono text-xs tracking-[0.18em] uppercase mb-4 text-[#1A6B3C]">
            {new Date(post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1a1a1a] mb-6 leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-xl text-[#555] mb-8 leading-relaxed font-medium">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between py-6 border-y border-[#D8D0C4] mt-10">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#1A6B3C] flex items-center justify-center font-bold text-white uppercase select-none">
                 S
               </div>
               <div>
                  <p className="text-sm font-bold text-[#1a1a1a]">SettleUp Editor</p>
                  <p className="text-xs text-[#6B6560]">Founding Member</p>
               </div>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
              }}
              className="p-2.5 rounded-full border border-[#D8D0C4] hover:bg-white transition-colors"
            >
              <Share2Line className="w-5 h-5 text-[#1a1a1a]" />
            </button>
          </div>
        </header>

        {post.cover_image_url && (
          <div className="aspect-video w-full rounded-2xl overflow-hidden mb-12 shadow-2xl shadow-[#1A6B3C]/10 border border-[#D8D0C4]">
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="prose prose-lg prose-slate max-w-none 
          prose-headings:text-[#1a1a1a] prose-headings:font-bold prose-headings:tracking-tight
          prose-p:text-[#333] prose-p:leading-relaxed
          prose-a:text-[#1A6B3C] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-[#1a1a1a]
          prose-code:text-[#1A6B3C] prose-code:bg-[#E8F5EE] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-blockquote:border-l-4 prose-blockquote:border-[#1A6B3C] prose-blockquote:bg-[#E8F5EE] prose-blockquote:px-8 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-[#1a1a1a]
          prose-img:rounded-xl prose-img:border prose-img:border-[#D8D0C4]
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]} children={post.content} />
        </div>
      </article>

      {/* Footer */}
      <footer className="py-20 px-6 bg-[#1a1a1a] text-white">
        <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">tired of awkward follow-ups?</h2>
            <p className="text-[#999] mb-10 max-w-md mx-auto">
              SettleUp automates your invoice reminders so you can focus on the work that matters.
            </p>
            <Link 
              to="/" 
              className="inline-block font-sans text-sm font-semibold px-8 py-4 rounded-full text-white transition-transform hover:scale-[1.02] active:scale-[0.97]"
              style={{ backgroundColor: "#1A6B3C" }}
            >
              get early access — it's free
            </Link>
            <div className="mt-20 border-t border-white/10 pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
               <img src={settleupLogo} alt="SettleUp" className="h-5 brightness-0 invert" />
               <div className="flex gap-8">
                 <Link to="/" className="text-xs text-[#6B6560] hover:text-white transition-colors">home</Link>
                 <Link to="/blog" className="text-xs text-[#6B6560] hover:text-white transition-colors">blog</Link>
                 <Link to="/sign-in" className="text-xs text-[#6B6560] hover:text-white transition-colors">sign in</Link>
               </div>
               <p className="font-mono text-[10px] tracking-widest text-[#444] uppercase">
                 © 2026 SettleUp.
               </p>
            </div>
        </div>
      </footer>
    </div>
  );
}
