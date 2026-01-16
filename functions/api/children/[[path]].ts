import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
// =========== 🔴 插入这段代码 (开始) ===========
  // 获取用户信息
  const { user } = context.data;
  
  // 核心判断：如果用户没登录(user为空) 且 没开启访客模式(GUEST为空)
  // 则直接返回 401 未授权错误，强制前端弹窗登录
  if (!user && !context.env.GUEST) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  // =========== 🔴 插入这段代码 (结束) ===========
  try {
    const [bucket, path] = parseBucketPath(context);
    const prefix = path && `${path}/`;
    if (!bucket || prefix.startsWith("_$flaredrive$/")) return notFound();

    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
    });
    const objKeys = objList.objects
      .filter((obj) => !obj.key.endsWith("/_$folder$"))
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        return { key, size, uploaded, httpMetadata, customMetadata };
      });

    let folders = objList.delimitedPrefixes;
    if (!path)
      folders = folders.filter((folder) => folder !== "_$flaredrive$/");

    return new Response(JSON.stringify({ value: objKeys, folders }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
