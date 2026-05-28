import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wifiizqxiuynpweumrkb.supabase.co",
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
    <ellipse cx="34" cy="55" rx="12" ry="10" fill="#8fcf8b"/>
    <ellipse cx="56" cy="55" rx="12" ry="10" fill="#8fcf8b"/>
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

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  useEffect(() => {
    const saved = localStorage.getItem("raner_user");
    if (saved) { setUser(JSON.parse(saved)); setPage("feed"); }
  }, []);

  useEffect(() => {
    if (user) { loadPosts(); loadSchedules(); if (user.role === "admin") { loadPendingUsers(); loadAllUsers(); } }
  }, [user]);

  const loadPosts = async () => {
    const { data } = await supabase.from("posts").select("*, comments(*)").order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  const loadSchedules = async () => {
    const { data } = await supabase.from("schedules").select("*").order("date", { ascending: true });
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

  const login = async () => {

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", loginForm.username.trim())
    .eq("password", loginForm.password.trim())
    .single();

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    return setLoginErr(error.message);
  }

  if (!data) {
    return setLoginErr("没有找到用户");
  }

  if (data.status === "pending") {
    return setLoginErr("账号待审核，请等待管理员批准");
  }

  setUser(data);
  localStorage.setItem("raner_user", JSON.stringify(data));
  setLoginErr("");
  setPage("feed");
};

  const register = async () => {
    if (!regForm.name || !regForm.username || !regForm.password) return setRegMsg("请填写所有必填项");
    const { error } = await supabase.from("users").insert({ name: regForm.name, username: regForm.username, password: regForm.password, role: "viewer", status: "pending" });
    if (error) return setRegMsg("用户名已存在");
    setRegMsg("申请已提交，等待管理员审核 ✓");
    setRegForm({ name: "", username: "", password: "", reason: "" });
  };

  const logout = () => { setUser(null); localStorage.removeItem("raner_user"); setPage("login"); setLoginForm({ username: "", password: "" }); };

  const approveUser = async id => {
    await supabase.from("users").update({ status: "active" }).eq("id", id);
    loadPendingUsers(); loadAllUsers(); showToast("已批准");
  };

  const rejectUser = async id => {
    await supabase.from("users").delete().eq("id", id);
    loadPendingUsers(); showToast("已拒绝");
  };

  const setRole = async (id, role) => {
    await supabase.from("users").update({ role }).eq("id", id);
    loadAllUsers(); showToast("权限已更新");
  };

  const publishPost = async () => {
    if (!newPost.trim()) return;
    await supabase.from("posts").insert({ content: newPost, author_id: user.id });
    setNewPost(""); loadPosts(); showToast("动态已发布 🌿");
  };

  const toggleLike = async postId => {
    if (likedPosts[postId]) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
      await supabase.from("posts").update({ likes: (posts.find(p => p.id === postId)?.likes || 1) - 1 }).eq("id", postId);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
      await supabase.from("posts").update({ likes: (posts.find(p => p.id === postId)?.likes || 0) + 1 }).eq("id", postId);
    }
    setLikedPosts(p => ({ ...p, [postId]: !p[postId] }));
    loadPosts();
  };

  const submitComment = async postId => {
    const text = (commentInput[postId] || "").trim();
    if (!text) return;
    await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: text });
    setCommentInput(p => ({ ...p, [postId]: "" }));
    loadPosts();
  };

  const addSchedule = async () => {
    if (!newSched.title || !newSched.date) return;
    await supabase.from("schedules").insert({ ...newSched, author_id: user.id });
    setNewSched({ title: "", date: "", time: "", location: "", description: "" });
    setShowSchedForm(false); loadSchedules(); showToast("日程已发布");
  };

  const getDisplayName = (authorId) => {
    if (user.role === "admin") {
      const u = users.find(x => x.id === authorId);
      return u ? u.name : "用户";
    }
    if (authorId === user.id) return "我";
    const u = users.find(x => x.id === authorId);
    if (u && (u.role === "member" || u.role === "admin")) return u.name;
    const viewers = users.filter(x => x.role === "viewer");
    const idx = viewers.findIndex(x => x.id === authorId);
    return idx >= 0 ? String(idx + 1).padStart(3, "0") : "访客";
  };

  const isTeam = (authorId) => {
    const u = users.find(x => x.id === authorId);
    return u && (u.role === "member" || u.role === "admin");
  };

  const canPost = user && (user.role === "admin" || user.role === "member");
  const roleLabel = { admin: "管理员", member: "团队", viewer: "粉丝" };

  const s = {
    wrap: { fontFamily: "'PingFang SC','Hiragino Sans GB',system-ui,sans-serif", minHeight: "100vh", background: "#f6f6f4", color: "#1a1a1a" },
    nav: { background: "#fff", borderBottom: "0.5px solid #e8e8e8", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 },
    logo: { fontWeight: 700, fontSize: 16, letterSpacing: "1.5px" },
    navBtn: a => ({ background: a ? "#f2f2f0" : "transparent", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 13, color: a ? "#1a1a1a" : "#888", cursor: "pointer", fontWeight: a ? 500 : 400 }),
    main: { maxWidth: 620, margin: "0 auto", padding: "1.25rem 1rem" },
    card: { background: "#fff", border: "0.5px solid #ebebeb", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10 },
    input: { width: "100%", border: "1px solid #e8e8e8", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", color: "#1a1a1a", resize: "none", fontFamily: "inherit" },
    label: { fontSize: 13, color: "#666", display: "block", marginBottom: 4 },
    btn: (v="default") => {
      const vs = { default:{background:"#1a1a1a",color:"#fff",border:"1px solid #1a1a1a"}, outline:{background:"#fff",color:"#444",border:"1px solid #ddd"}, ghost:{background:"transparent",color:"#aaa",border:"none"}, danger:{background:"#fff",color:"#c0392b",border:"1px solid #fcc"} };
      return { ...vs[v], borderRadius: 7, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500, fontFamily: "inherit" };
    },
    badge: t => {
      const m = { admin:["#f0edff","#6c5ce7"], member:["#e8f5fb","#0984e3"], viewer:["#f5f5f5","#888"], pending:["#fff8e1","#e17055"] };
      const [bg,col] = m[t]||m.viewer;
      return { background:bg, color:col, fontSize:11, padding:"2px 8px", borderRadius:20, display:"inline-block", fontWeight:500 };
    },
    avatar: (label, size=36) => ({ width:size, height:size, borderRadius:"50%", background:avatarBg(label||"?"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:500, color:"#555", flexShrink:0 }),
    divider: { border:"none", borderTop:"0.5px solid #f0f0f0", margin:"0.75rem 0" },
    toast: { position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:"#1a1a1a", color:"#fff", padding:"9px 18px", borderRadius:20, fontSize:13, zIndex:9999, pointerEvents:"none", whiteSpace:"nowrap" },
    tag: { fontSize:12, background:"#f5f5f5", color:"#888", padding:"3px 9px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4 },
  };

  if (page === "login") return (
    <div style={{ ...s.wrap, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:340 }}>
        <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><Tree /></div>
          <div style={{ fontWeight:700, fontSize:22, letterSpacing:"2px" }}>然er和风</div>
          <div style={{ fontSize:11, color:"#bbb", marginTop:4, letterSpacing:"3px" }}>RANER · HEFENG</div>
        </div>
        <div style={s.card}>
          <div style={{ marginBottom:12 }}>
            <label style={s.label}>用户名</label>
            <input style={s.input} value={loginForm.username} onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))} placeholder="输入用户名" onKeyDown={e=>e.key==="Enter"&&login()} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={s.label}>密码</label>
            <input style={s.input} type="password" value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))} placeholder="输入密码" onKeyDown={e=>e.key==="Enter"&&login()} />
          </div>
          {loginErr && <div style={{ fontSize:13, color:"#c0392b", marginBottom:10 }}>{loginErr}</div>}
          <button style={{ ...s.btn(), width:"100%", padding:"9px" }} onClick={login}>登录</button>
          <hr style={s.divider}/>
          <button style={{ ...s.btn("outline"), width:"100%", padding:"9px" }} onClick={()=>setPage("register")}>申请加入</button>
        </div>
      </div>
    </div>
  );

  if (page === "register") return (
    <div style={{ ...s.wrap, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:360 }}>
        <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><Tree /></div>
          <div style={{ fontWeight:700, fontSize:20, letterSpacing:"2px" }}>然er和风</div>
          <p style={{ fontSize:13, color:"#888", marginTop:6 }}>申请加入，审核通过后即可查看内容</p>
        </div>
        <div style={s.card}>
          {[["name","你的名字","text"],["username","用户名","text"],["password","密码","password"]].map(([f,l,t])=>(
            <div key={f} style={{ marginBottom:12 }}>
              <label style={s.label}>{l}</label>
              <input style={s.input} type={t} value={regForm[f]} onChange={e=>setRegForm(p=>({...p,[f]:e.target.value}))} />
            </div>
          ))}
          <div style={{ marginBottom:14 }}>
            <label style={s.label}>申请理由（可选）</label>
            <textarea style={{ ...s.input, minHeight:56 }} value={regForm.reason} onChange={e=>setRegForm(p=>({...p,reason:e.target.value}))} />
          </div>
          {regMsg && <div style={{ fontSize:13, color:regMsg.includes("✓")?"#2d8a4e":"#c0392b", marginBottom:10 }}>{regMsg}</div>}
          <button style={{ ...s.btn(), width:"100%", padding:"9px" }} onClick={register}>提交申请</button>
          <hr style={s.divider}/>
          <button style={{ ...s.btn("outline"), width:"100%", padding:"9px" }} onClick={()=>{setPage("login");setRegMsg("");}}>返回登录</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <nav style={s.nav}>
        <span style={s.logo}>🌿 然er和风</span>
        <div style={{ display:"flex", gap:2 }}>
          {[["feed","动态"],["schedule","日程"]].map(([p,l])=>(
            <button key={p} style={s.navBtn(page===p)} onClick={()=>setPage(p)}>{l}</button>
          ))}
          {user?.role==="admin" && (
            <button style={s.navBtn(page==="admin")} onClick={()=>{ setPage("admin"); loadPendingUsers(); loadAllUsers(); }}>
              后台{pendingUsers.length>0&&<span style={{ background:"#e53e3e",color:"#fff",borderRadius:10,fontSize:10,padding:"1px 5px",marginLeft:2 }}>{pendingUsers.length}</span>}
            </button>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={s.avatar(user.name[0], 28)}>{user.name[0]}</div>
          <span style={{ fontSize:13, color:"#666" }}>{user.name}</span>
          <span style={s.badge(user.role)}>{roleLabel[user.role]}</span>
          <button style={{ ...s.btn("ghost"), fontSize:12, color:"#bbb", padding:"4px 6px" }} onClick={logout}>退出</button>
        </div>
      </nav>

      {toast && <div style={s.toast}>{toast}</div>}

      <div style={s.main}>
        {page==="feed" && (
          <div>
            {canPost && (
              <div style={{ ...s.card, marginBottom:14 }}>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={s.avatar(user.name[0])}>{user.name[0]}</div>
                  <div style={{ flex:1 }}>
                    <textarea style={{ ...s.input, minHeight:72, border:"none", padding:"4px 0", fontSize:14, lineHeight:1.7 }} placeholder="分享你的日常、心情，或一句想说的话…" value={newPost} onChange={e=>setNewPost(e.target.value)} />
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                      <button style={s.btn()} onClick={publishPost}>发布</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {posts.map(post => {
              const expanded = expandedPost[post.id];
              const long = post.content.length > 100;
              const team = isTeam(post.author_id);
              const authorName = team ? (users.find(x=>x.id===post.author_id)?.name || "团队") : getDisplayName(post.author_id);
              const initial = authorName[0] || "?";
              return (
                <div key={post.id} style={s.card}>
                  <div style={{ display:"flex", gap:10 }}>
                    <div style={s.avatar(initial)}>{initial}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", marginBottom:6 }}>
                        <span style={{ fontWeight:500, fontSize:14 }}>{authorName}</span>
                        {team && <span style={{ ...s.badge("member"), marginLeft:6, fontSize:10 }}>团队</span>}
                        <span style={{ fontSize:11, color:"#ccc", marginLeft:8 }}>{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
                      </div>
                      <div style={{ fontSize:15, lineHeight:1.75, color:"#222", marginBottom:10, whiteSpace:"pre-wrap" }}>
                        {expanded || !long ? post.content : post.content.slice(0,100)+"…"}
                        {long && <span style={{ color:"#aaa", fontSize:13, cursor:"pointer", marginLeft:4 }} onClick={()=>setExpandedPost(p=>({...p,[post.id]:!p[post.id]}))}>{expanded?" 收起":"展开"}</span>}
                      </div>
                      <div style={{ display:"flex", gap:16, borderTop:"0.5px solid #f5f5f5", paddingTop:8 }}>
                        <button style={{ ...s.btn("ghost"), padding:"2px 0", fontSize:13, color:likedPosts[post.id]?"#e05a7a":"#bbb", display:"flex", alignItems:"center", gap:5 }} onClick={()=>toggleLike(post.id)}>
                          {likedPosts[post.id]?"♥":"♡"} <span style={{ fontSize:12, color:"#aaa" }}>{post.likes}</span>
                        </button>
                        <button style={{ ...s.btn("ghost"), padding:"2px 0", fontSize:13, color:"#bbb", display:"flex", alignItems:"center", gap:5 }} onClick={()=>setOpenComments(p=>({...p,[post.id]:!p[post.id]}))}>
                          💬 <span style={{ fontSize:12 }}>{(post.comments||[]).length}</span>
                        </button>
                      </div>
                      {openComments[post.id] && (
                        <div style={{ marginTop:10 }}>
                          {(post.comments||[]).map(c => {
                            const cTeam = isTeam(c.user_id);
                            const cName = cTeam ? (users.find(x=>x.id===c.user_id)?.name||"团队") : getDisplayName(c.user_id);
                            return (
                              <div key={c.id} style={{ display:"flex", gap:8, marginBottom:8 }}>
                                <div style={s.avatar(cName[0], 26)}>{cName[0]}</div>
                                <div style={{ flex:1, background:"#f8f8f8", borderRadius:8, padding:"7px 10px" }}>
                                  <span style={{ fontWeight:500, fontSize:12, color:"#555" }}>{cName}</span>
                                  {cTeam && <span style={{ ...s.badge("member"), marginLeft:5, fontSize:9 }}>团队</span>}
                                  <div style={{ fontSize:13, color:"#333", marginTop:2, lineHeight:1.6 }}>{c.content}</div>
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ display:"flex", gap:8 }}>
                            <div style={s.avatar(user.name[0], 26)}>{user.name[0]}</div>
                            <div style={{ flex:1, display:"flex", gap:6 }}>
                              <input style={{ ...s.input, flex:1, padding:"6px 10px", fontSize:13 }} placeholder="写下评论…" value={commentInput[post.id]||""} onChange={e=>setCommentInput(p=>({...p,[post.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&submitComment(post.id)} />
                              <button style={{ ...s.btn(), padding:"6px 12px", fontSize:13 }} onClick={()=>submitComment(post.id)}>发送</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {page==="schedule" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontSize:17, fontWeight:600, margin:0 }}>近期日程</h2>
              {canPost && <button style={s.btn()} onClick={()=>setShowSchedForm(!showSchedForm)}>{showSchedForm?"取消":"+ 新增"}</button>}
            </div>
            {showSchedForm && (
              <div style={{ ...s.card, marginBottom:14, background:"#fafafa" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  {[["title","标题","text"],["date","日期","date"],["time","时间","time"],["location","地点","text"]].map(([f,l,t])=>(
                    <div key={f}><label style={s.label}>{l}</label><input style={s.input} type={t} value={newSched[f]} onChange={e=>setNewSched(p=>({...p,[f]:e.target.value}))} /></div>
                  ))}
                </div>
                <div style={{ marginBottom:10 }}><label style={s.label}>详情</label><textarea style={{ ...s.input, minHeight:56 }} value={newSched.description} onChange={e=>setNewSched(p=>({...p,description:e.target.value}))} /></div>
                <button style={s.btn()} onClick={addSchedule}>发布</button>
              </div>
            )}
            <div style={{ position:"relative", paddingLeft:20 }}>
              <div style={{ position:"absolute", left:6, top:8, bottom:8, width:1, background:"#e8e8e8" }}/>
              {schedules.map(sch=>(
                <div key={sch.id} style={{ position:"relative", marginBottom:14 }}>
                  <div style={{ position:"absolute", left:-17, top:18, width:9, height:9, borderRadius:"50%", background:"#1a1a1a", border:"2px solid #f6f6f4" }}/>
                  <div style={s.card}>
                    <div style={{ fontSize:12, color:"#bbb", marginBottom:4 }}>{sch.date}{sch.time&&" · "+sch.time}</div>
                    <div style={{ fontWeight:500, fontSize:15, marginBottom:sch.location?6:0 }}>{sch.title}</div>
                    {sch.location&&<span style={{ ...s.tag, marginBottom:sch.description?6:0 }}>📍 {sch.location}</span>}
                    {sch.description&&<div style={{ fontSize:13, color:"#666", lineHeight:1.65, marginTop:6 }}>{sch.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page==="admin" && user.role==="admin" && (
          <div>
            <h2 style={{ fontSize:17, fontWeight:600, margin:"0 0 16px" }}>管理后台</h2>
            <div style={{ ...s.card, marginBottom:12 }}>
              <div style={{ fontWeight:500, fontSize:14, marginBottom:12 }}>注册审核 {pendingUsers.length>0&&<span style={s.badge("pending")}>{pendingUsers.length} 待审核</span>}</div>
              {pendingUsers.length===0 ? <div style={{ fontSize:13, color:"#ccc" }}>暂无待审核申请</div> : pendingUsers.map(u=>(
                <div key={u.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"0.5px solid #f0f0f0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={s.avatar(u.name[0],28)}>{u.name[0]}</div>
                    <div><div style={{ fontWeight:500, fontSize:14 }}>{u.name}</div><div style={{ fontSize:12, color:"#aaa" }}>@{u.username}</div></div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button style={s.btn()} onClick={()=>approveUser(u.id)}>批准</button>
                    <button style={s.btn("danger")} onClick={()=>rejectUser(u.id)}>拒绝</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ fontWeight:500, fontSize:14, marginBottom:12 }}>用户管理</div>
              <div style={{ fontSize:12, color:"#aaa", background:"#fafafa", borderRadius:7, padding:"8px 10px", marginBottom:10 }}>💡 管理员可查看所有用户真实信息，粉丝之间互相匿名显示编号</div>
              {users.map((u,i)=>(
                <div key={u.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"0.5px solid #f0f0f0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={s.avatar(u.name[0],28)}>{u.name[0]}</div>
                    <div>
                      <span style={{ fontWeight:500, fontSize:14 }}>{u.name}</span>
                      <span style={{ fontSize:12, color:"#aaa", marginLeft:6 }}>@{u.username}</span>
                      {u.role==="viewer"&&<span style={{ fontSize:11, color:"#ccc", marginLeft:6 }}>(编号 {String(i+1).padStart(3,"0")})</span>}
                    </div>
                    <span style={s.badge(u.role)}>{roleLabel[u.role]}</span>
                  </div>
                  {u.role!=="admin"&&(
                    <select value={u.role} onChange={e=>setRole(u.id,e.target.value)} style={{ border:"1px solid #e8e8e8", borderRadius:7, padding:"5px 8px", fontSize:13, background:"#fff" }}>
                      <option value="viewer">粉丝</option>
                      <option value="member">团队成员</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
