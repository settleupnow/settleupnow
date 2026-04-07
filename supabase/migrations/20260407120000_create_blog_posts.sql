-- Create the blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_image_url text,
  is_published boolean DEFAULT false,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published posts
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.blog_posts FOR SELECT 
  USING (is_published = true);

-- Policy: Admins can do everything (assuming the authenticated user is an admin based on our app context)
-- More strictly, users can manage their own posts, or we can just allow auth users since the UI protects it
CREATE POLICY "Users can manage their own posts." 
  ON public.blog_posts FOR ALL 
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for blog-images
CREATE POLICY "Blog images are publicly accessible." 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can upload blog images." 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete blog images." 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'blog-images' AND auth.role() = 'authenticated');
