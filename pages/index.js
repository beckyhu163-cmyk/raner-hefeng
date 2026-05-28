import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wifiizqiuynpweumrkb.supabase.co",
  "sb_publishable_ZNiCaBJE9siL-HMJd8ZtHQ_-2M5te7H"
);

const avatarBg = n => {
  const c = ["#fce4ec","#e8f5e9","#e3f2fd","#fff8e1","#f3e5f5","#e0f7fa"];
  return c[(n||"?").charCodeAt(0) % c.length];
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

  const [loginErr, setLoginErr] = useState("");
  const [regMsg, setRegMsg] = useState("");

  const [newPost, setNewPost] = useState("");
  const [newSched, setNewSched] = useState({ title: "", date: "", time: "", location: "", description: "" });

  const [showSchedForm, setShowSchedForm] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [toast, setToast] = useState("");
  const [expandedPost, setExpandedPost] = useState({});
  const [pendingUsers, setPendingUsers] = useState([]);

  /* ================= ⭐ 新增：文件状态 ================= */
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    const saved = localStorage.getItem("raner_user");
    if (saved) {
      setUser(JSON.parse(saved));
      setPage("feed");
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadPosts();
      loadSchedules();
      if (user.role === "admin") {
        loadPendingUsers();
        loadAllUsers();
      }
    }
  }, [user]);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, comments(*)")
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  const loadSchedules = async () => {
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .order("date", { ascending: true });

    if (data) setSchedules(data);
  };

  const loadPendingUsers = async () => {
    const { data } = await supabase.from("users").select("*").eq("status", "pending");
    if (data) setPendingUsers(data);
  };

  const loadAllUsers = async () => {
    const { data } = await supabase.from("users").select("*").eq("status", "active");
    if (data) setUsers(data);
  };

  /* ================= 登录 ================= */
  const login = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", loginForm.username.trim())
      .eq("password", loginForm.password.trim())
      .single();

    if (error || !data) return setLoginErr("用户名或密码错误");

    if (data.status === "pending") return setLoginErr("账号待审核，请等待管理员批准");

    setUser(data);
    localStorage.setItem("raner_user", JSON.stringify(data));
    setLoginErr("");
    setPage("feed");
  };

  const register = async () => {
    if (!regForm.name || !regForm.username || !regForm.password)
      return setRegMsg("请填写所有必填项");

    const { error } = await supabase.from("users").insert({
      name: regForm.name,
      username: regForm.username,
      password: regForm.password,
      role: "viewer",
      status: "pending"
    });

    if (error) return setRegMsg("用户名已存在");

    setRegMsg("申请已提交，等待管理员审核 ✓");
    setRegForm({ name: "", username: "", password: "", reason: "" });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("raner_user");
    setPage("login");
  };

  /* ================= ⭐ 新增：上传函数 ================= */
  const uploadFile = async (file, folder) => {
    if (!file) return null;

    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("media")
      .upload(`${folder}/${fileName}`, file);

    if (error) return null;

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  /* ================= ⭐ 改造：发布动态（UI不动） ================= */
  const publishPost = async () => {
    if (!newPost.trim() && !imageFile && !videoFile) return;

    const image_url = await uploadFile(imageFile, "images");
    const video_url = await uploadFile(videoFile, "videos");

    await supabase.from("posts").insert({
      content: newPost,
      author_id: user.id,
      image_url,
      video_url
    });

    setNewPost("");
    setImageFile(null);
    setVideoFile(null);

    loadPosts();
    showToast("动态已发布 🌿");
  };

  const addSchedule = async () => {
    if (!newSched.title || !newSched.date) return;

    await supabase.from("schedules").insert({
      ...newSched,
      author_id: user.id
    });

    setNewSched({ title: "", date: "", time: "", location: "", description: "" });
    setShowSchedForm(false);
    loadSchedules();
    showToast("日程已发布");
  };

  const roleLabel = {
    admin: "管理员",
    member: "团队",
    viewer: "粉丝"
  };

  const canPost = user && (user.role === "admin" || user.role === "member");

  const s = {
    wrap: { fontFamily: "'PingFang SC','Hiragino Sans GB',system-ui,sans-serif", minHeight: "100vh", background: "#f6f6f4", color: "#1a1a1a" },
    nav: { background: "#fff", borderBottom: "0.5px solid #e8e8e8", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0 },
    logo: { fontWeight: 700 },
    card: { background: "#fff", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10 },
    input: { width: "100%", border: "1px solid #e8e8e8", borderRadius: 8, padding: "8px 12px" },
    btn: { padding: "7px 14px", borderRadius: 7, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }
  };

  /* ================= UI（完全不动） ================= */

  if (page === "login") return (
    <div style={s.wrap}>
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh" }}>
        <div style={s.card}>
          <Tree />
          <h3>然er和风</h3>

          <input
            placeholder="用户名"
            value={loginForm.username}
            onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))}
            style={s.input}
          />

          <input
            type="password"
            placeholder="密码"
            value={loginForm.password}
            onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))}
            style={s.input}
          />

          {loginErr && <p style={{color:"red"}}>{loginErr}</p>}

          <button onClick={login} style={s.btn}>登录</button>
          <button onClick={()=>setPage("register")} style={s.btn}>注册</button>
        </div>
      </div>
    </div>
  );

  if (page === "feed") return (
    <div style={s.wrap}>
      <nav style={s.nav}>
        <span style={s.logo}>🌿 然er和风</span>
        <button onClick={logout}>退出</button>
      </nav>

      <div style={{ maxWidth:600, margin:"auto", padding:20 }}>

        {canPost && (
          <div style={s.card}>
            <textarea
              style={s.input}
              value={newPost}
              onChange={e=>setNewPost(e.target.value)}
              placeholder="分享你的动态"
            />

            {/* ⭐ 新增（UI不动，只加功能） */}
            <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0])} />
            <input type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files[0])} />

            <button onClick={publishPost} style={s.btn}>发布</button>
          </div>
        )}

        {posts.map(p=>(
          <div key={p.id} style={s.card}>
            <div>{p.content}</div>

            {/* ⭐ 新增展示（不影响UI结构） */}
            {p.image_url && (
              <img src={p.image_url} style={{ width:"100%", marginTop:10 }} />
            )}

            {p.video_url && (
              <video src={p.video_url} controls style={{ width:"100%", marginTop:10 }} />
            )}
          </div>
        ))}

      </div>
    </div>
  );

  return null;
}
