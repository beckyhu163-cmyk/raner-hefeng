import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wifiizqiuynpweumrkb.supabase.co",
  "sb_publishable_ZNiCaBJE9siL-HMJd8ZtHQ_-2M5te7H"
);

// ================= 上传函数 =================
const uploadFile = async (file, folder = "media") => {
  const ext = file.name.split(".").pop();
  const filePath = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file);

  if (error) {
    console.log(error);
    return null;
  }

  const { data } = supabase.storage
    .from("uploads")
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");

  const [posts, setPosts] = useState([]);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({
    name: "",
    username: "",
    password: "",
  });

  const [newPost, setNewPost] = useState("");
  const [file, setFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [commentText, setCommentText] = useState({});
  const [liked, setLiked] = useState({});

  // ================= 初始化用户 =================
  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  // ================= 拉取动态 =================
  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  // ================= 登录 =================
  const login = async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("username", loginForm.username)
      .eq("password", loginForm.password)
      .single();

    if (!data) return alert("账号或密码错误");

    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    setPage("feed");
  };

  // ================= 注册 =================
  const register = async () => {
    let avatarUrl = null;

    if (avatarFile) {
      avatarUrl = await uploadFile(avatarFile, "avatar");
    }

    await supabase.from("users").insert({
      ...regForm,
      role: "viewer",
      status: "active",
      avatar_url: avatarUrl,
    });

    alert("注册成功");
    setPage("login");
  };

  // ================= 发帖 =================
  const publish = async () => {
    if (!newPost && !file) return;

    let mediaUrl = null;
    let mediaType = null;

    if (file) {
      mediaUrl = await uploadFile(file);
      mediaType = file.type.startsWith("image")
        ? "image"
        : "video";
    }

    await supabase.from("posts").insert({
      content: newPost,
      media_url: mediaUrl,
      media_type: mediaType,
      author_id: user.id,
      likes: 0,
    });

    setNewPost("");
    setFile(null);
    loadPosts();
  };

  // ================= 点赞 =================
  const likePost = async (post) => {
    const newLike = post.likes + 1;

    await supabase
      .from("posts")
      .update({ likes: newLike })
      .eq("id", post.id);

    loadPosts();
  };

  // ================= 评论 =================
  const addComment = async (postId) => {
    const text = commentText[postId];
    if (!text) return;

    await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: text,
    });

    setCommentText({ ...commentText, [postId]: "" });
  };

  // ================= UI =================
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        {page === "login" ? (
          <>
            <h2>登录</h2>
            <input
              placeholder="用户名"
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
            />
            <input
              placeholder="密码"
              type="password"
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />
            <button onClick={login}>登录</button>
            <button onClick={() => setPage("register")}>注册</button>
          </>
        ) : (
          <>
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
              placeholder="密码"
              type="password"
              onChange={(e) =>
                setRegForm({ ...regForm, password: e.target.value })
              }
            />

            <input type="file" onChange={(e) => setAvatarFile(e.target.files[0])} />

            <button onClick={register}>注册</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>微博动态</h2>

      {/* 发帖 */}
      <textarea
        placeholder="发点什么..."
        value={newPost}
        onChange={(e) => setNewPost(e.target.value)}
      />

      <input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={publish}>发布</button>

      {/* 动态流 */}
      {posts.map((p) => (
        <div key={p.id} style={{ border: "1px solid #ddd", margin: 10 }}>
          <p>{p.content}</p>

          {p.media_type === "image" && (
            <img src={p.media_url} style={{ width: 300 }} />
          )}

          {p.media_type === "video" && (
            <video src={p.media_url} controls style={{ width: 300 }} />
          )}

          <div>
            <button onClick={() => likePost(p)}>❤️ {p.likes}</button>
          </div>

          <input
            placeholder="评论"
            value={commentText[p.id] || ""}
            onChange={(e) =>
              setCommentText({ ...commentText, [p.id]: e.target.value })
            }
          />
          <button onClick={() => addComment(p.id)}>发送</button>
        </div>
      ))}
    </div>
  );
}
