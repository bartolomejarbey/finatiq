"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
  };
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  user_reactions: string[];
  comments: Comment[];
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
};

const REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUser();
    loadPosts();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser({ ...user, profile });
    }
  };

  const loadPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: postsData } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:user_id (full_name, role),
        post_likes (user_id),
        post_comments (id, content, created_at, user_id, profiles:user_id (full_name)),
        post_reactions (user_id, emoji)
      `)
      .order("created_at", { ascending: false });

    if (postsData) {
      const postsWithDetails = postsData.map((post: any) => {
        const likes = post.post_likes || [];
        const comments = post.post_comments || [];
        const reactions = post.post_reactions || [];

        return {
          ...post,
          likes_count: likes.length,
          comments_count: comments.length,
          user_liked: user ? likes.some((l: any) => l.user_id === user.id) : false,
          user_reactions: user
            ? reactions.filter((r: any) => r.user_id === user.id).map((r: any) => r.emoji)
            : [],
          comments: comments
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(0, 5),
          post_likes: undefined,
          post_comments: undefined,
          post_reactions: undefined,
        };
      });

      setPosts(postsWithDetails);
    }
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!currentUser || (!newPostContent.trim() && !newPostImage)) return;
    
    setPosting(true);
    let imageUrl = null;

    if (newPostImage) {
      const fileExt = newPostImage.name.split(".").pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, newPostImage);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("posts")
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    await supabase.from("posts").insert({
      user_id: currentUser.id,
      content: newPostContent.trim(),
      image_url: imageUrl,
    });

    setNewPostContent("");
    setNewPostImage(null);
    setImagePreview(null);
    setPosting(false);
    loadPosts();
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser) return;

    if (isLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id);
    } else {
      await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: currentUser.id,
      });
    }
    loadPosts();
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!currentUser) return;

    const post = posts.find(p => p.id === postId);
    const hasReaction = post?.user_reactions.includes(emoji);

    if (hasReaction) {
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: currentUser.id,
        emoji,
      });
    }
    setShowReactions(null);
    loadPosts();
  };

  const handleComment = async (postId: string) => {
    if (!currentUser || !newComment.trim()) return;

    await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUser.id,
      content: newComment.trim(),
    });

    setNewComment("");
    loadPosts();
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "právě teď";
    if (diffMins < 60) return `před ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `před ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `před ${diffDays}d`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Feed</h1>
            <p className="text-gray-600 mt-2">Sdílejte své projekty a inspirujte ostatní</p>
          </div>

          {/* New Post */}
          {currentUser ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {currentUser.profile?.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Co je nového? Sdílejte svůj projekt..."
                    className="w-full border-0 resize-none focus:ring-0 text-gray-700 placeholder-gray-400 text-lg"
                    rows={3}
                  />
                  
                  {imagePreview && (
                    <div className="relative mt-3">
                      <img src={imagePreview} alt="Preview" className="rounded-xl max-h-64 object-cover" />
                      <button
                        onClick={() => { setNewPostImage(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        📷 Fotka
                      </button>
                    </div>
                    <button
                      onClick={handlePost}
                      disabled={posting || (!newPostContent.trim() && !newPostImage)}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                      {posting ? "Publikuji..." : "Publikovat"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
              <p className="text-gray-600 mb-4">Pro přidávání příspěvků se musíte přihlásit</p>
              <Link href="/auth/login" className="text-cyan-600 font-semibold hover:text-cyan-700">
                Přihlásit se →
              </Link>
            </div>
          )}

          {/* Posts */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Zatím žádné příspěvky</h3>
              <p className="text-gray-600">Buďte první, kdo něco sdílí!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Post Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                        {post.profiles?.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{post.profiles?.full_name}</span>
                          {post.profiles?.role === "provider" && (
                            <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full">Fachman</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                    </div>
                  )}

                  {/* Image */}
                  {post.image_url && (
                    <div className="px-6 pb-4">
                      <img src={post.image_url} alt="" className="rounded-xl w-full object-cover max-h-96" />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <span>{post.likes_count} líbí se</span>
                    <span>{post.comments_count} komentářů</span>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                      onClick={() => currentUser && handleLike(post.id, post.user_liked)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-colors ${
                        post.user_liked ? "text-cyan-600 bg-cyan-50" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {post.user_liked ? "❤️" : "🤍"} Líbí se
                    </button>
                    
                    <div className="relative flex-1">
                      <button
                        onClick={() => setShowReactions(showReactions === post.id ? null : post.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        😀 Reakce
                      </button>
                      {showReactions === post.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1 flex gap-1">
                          {REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(post.id, emoji)}
                              className={`w-10 h-10 rounded-full hover:bg-gray-100 text-xl transition-transform hover:scale-125 ${
                                post.user_reactions.includes(emoji) ? "bg-cyan-100" : ""
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      💬 Komentář
                    </button>
                  </div>

                  {/* Comments Section */}
                  {openComments === post.id && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                      {post.comments.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {comment.profiles?.full_name?.charAt(0) || "?"}
                              </div>
                              <div className="flex-1 bg-white rounded-xl px-4 py-2">
                                <span className="font-semibold text-sm text-gray-900">{comment.profiles?.full_name}</span>
                                <p className="text-sm text-gray-700">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {currentUser && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {currentUser.profile?.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Napište komentář..."
                              className="flex-1 bg-white rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                            />
                            <button
                              onClick={() => handleComment(post.id)}
                              className="bg-cyan-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-cyan-600"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}