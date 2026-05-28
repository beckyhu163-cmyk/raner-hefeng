import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wifiizqiuynpweumrkb.supabase.co",
  "sb_publishable_ZNiCaBJE9siL-HMJd8ZtHQ_-2M5te7H"
);

// ================= 新增：上传文件（图片/视频/头像）=================
const uploadFile = async (file, folder = "media") => {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const filePath = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file);

  if (error) {
    console.log("upload error:", error);
    return null;
  }

  const { data } = supabase.storage
    .from("uploads")
    .getPublicUrl(filePath);

  return data.publicUrl;
};

const avatarBg = (n) => {
  const c = ["#fce4ec","#e8f5e9","#e3f2fd","#fff8e1","#f3e5f5","#e0f7fa"];
  return c[(n || "?").charCodeAt(0) % c.length];
};

const Tree = () => (
  <svg width="80" height="90" viewBox="0 0 90 100" fill="none">
    <rect x="38" y="70" width="14" height="28" rx="4" fill="#c8a97e"/>
    <ellipse cx="45" cy="52" rx="28" ry="26" fill="#a8d5a2"/>
    <ellipse cx="45" cy="40" rx="22" ry="20" fill="#7ec87a"/>
    <ellipse cx="45" cy="30" rx="15" ry="14" fill="#5ab356"/>
  </svg>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");

  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", username: "", password: "", reason: "" });

  const [newPost, setNewPost] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [loginErr, setLoginErr] = useState("");
  const [regMsg, setRegMsg] = useState("");

  const [commentInput, setCommentInput] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [expandedPost, setExpandedPost] = useState({});
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  useEffect(() => {
    const saved = localStorage.getItem("raner_user");
    if (saved) {
      setUser(JSON.parse(saved));
      setPage("feed");
    }
  }, []);

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  // ================= 登录 =================
  const login = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", loginForm.username.trim())
      .eq("password", loginForm.password.trim())
      .single();

    if (error || !data) {
      setLoginErr("用户名或密码错误");
      return;
    }

    setUser(data);
    localStorage.setItem("raner_user", JSON.stringify(data));
    setPage("feed");
  };

  // ================= 注册（支持头像）=================
  const register = async () => {
    let avatarUrl = null;

    if (avatarFile) {
      avatarUrl = await uploadFile(avatarFile, "avatar");
    }

    const { error } = await supabase.from("users").insert({
      ...regForm,
      role: "viewer",
      status: "active",
      avatar_url: avatarUrl,
    });

    if (error) return setRegMsg("注册失败");

    setRegMsg("注册成功 ✓");
    setPage("login");
  };

  // ================= 发布（新增图片/视频）=================
  const publishPost = async () => {
    if (!newPost.trim() && !mediaFile) return;

    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      mediaUrl = await uploadFile(mediaFile, "posts");

      if (mediaFile.type.startsWith("image")) mediaType = "image";
      if (mediaFile.type.startsWith("video")) mediaType = "video";
    }

    await supabase.from("posts").insert({
      content: newPost,
      author_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType,
      likes: 0,
    });

    setNewPost("");
    setMediaFile(null);
    loadPosts();
    showToast("发布成功 🌿");
  };

  // ================= 点赞 =================
  const toggleLike = async (post) => {
    const newLike = (post.likes || 0) + 1;

    await supabase
      .from("posts")
      .update({ likes: newLike })
      .eq("id", post.id);

    loadPosts();
  };

  // ================= 评论 =================
  const addComment = async (postId) => {
    const text = commentInput[postId];
    if (!text) return;

    await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: text,
    });

    setCommentInput({ ...commentInput, [postId]: "" });
  };

  // ================= UI（完全保留你的风格）=================
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        {page === "login" ? (
          <div>
            <Tree />
            <h2>然er和风</h2>

            <input
              placeholder="用户名"
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="密码"
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />

            <button onClick={login}>登录</button>
            <button onClick={() => setPage("register")}>注册</button>

            <div style={{ color: "red" }}>{loginErr}</div>
          </div>
        ) : (
          <div>
            <h2>注册</h2>

            <input
              placeholder="昵称"
              onChange={(e) =>
                setRegForm({ ...regForm, name: e.target.value })
              }
            />
            <input
              placeholder="用户名"
              onChange={(e) =>
                setRegForm({ ...regForm, username: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="密码"
              onChange={(e) =>
                setRegForm({ ...regForm, password: e.target.value })
              }
            />

            <input type="file" onChange={(e) => setAvatarFile(e.target.files[0])} />

            <button onClick={register}>提交</button>
            <div>{regMsg}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {toast && <div>{toast}</div>}

      <h2>🌿 然er和风</h2>

      {/* 发布区（只加上传，不改UI） */}
      <textarea
        placeholder="说点什么..."
        value={newPost}
        onChange={(e) => setNewPost(e.target.value)}
      />

      <input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setMediaFile(e.target.files[0])}
      />

      <button onClick={publishPost}>发布</button>

      {/* feed */}
      {posts.map((p) => (
        <div key={p.id} style={{ border: "1px solid #ddd", margin: 10 }}>
          <p>{p.content}</p>

          {p.media_type === "image" && (
            <img src={p.media_url} style={{ width: 300 }} />
          )}

          {p.media_type === "video" && (
            <video src={p.media_url} controls style={{ width: 300 }} />
          )}

          <button onClick={() => toggleLike(p)}>❤️ {p.likes}</button>

          <input
            placeholder="评论"
            value={commentInput[p.id] || ""}
            onChange={(e) =>
              setCommentInput({ ...commentInput, [p.id]: e.target.value })
            }
          />

          <button onClick={() => addComment(p.id)}>发送</button>
        </div>
      ))}
    </div>
  );
}
