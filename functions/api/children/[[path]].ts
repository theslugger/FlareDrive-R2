import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
// ==================== 🔴 修正后的完整鉴权逻辑 (开始) ====================
  let { user } = context.data; // 尝试获取已有用户状态

  // 1. 如果没登录，尝试从请求头里“检票” (读取你输入的账号密码)
  const authHeader = context.request.headers.get("Authorization");
  if (!user && authHeader) {
    // 解析 Basic Auth (格式是 "Basic base64编码")
    const base64Credentials = authHeader.split(" ")[1];
    if (base64Credentials) {
      const credentials = atob(base64Credentials); // 解码得到 "admin:qq113320"
      
      // 核心验证：检查环境变量里有没有这个 "账号:密码" 的变量名
      // 因为你的环境变量名就是 "admin:qq113320"
      if (context.env[credentials]) {
        // 验证成功！手动赋予用户身份
        user = { name: credentials.split(":")[0], permissions: context.env[credentials] };
      }
    }
  }

  // 2. 如果经过上面的检票还是没登录，且没开访客模式，才弹窗
  if (!user && !context.env.GUEST) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { 
        // 召唤浏览器弹窗
        "WWW-Authenticate": 'Basic realm="FlareDrive R2"',
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }
  // ==================== 🔴 修正后的完整鉴权逻辑 (结束) ====================
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
