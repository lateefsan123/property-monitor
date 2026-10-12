export function createOutreachHandler({ authenticate, service }) {
  return async (req,res) => {
    const send = (status,value) => {res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
    if (req.method !== 'POST') {res.setHeader('Allow','POST');return send(405,{error:'POST required'});}
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')?.[1];
    if (!token) return send(401,{error:'Sign in to manage outreach'});
    let user;
    try {user=await authenticate(token);} catch {return send(401,{error:'Sign in again'});}
    if (!user?.id) return send(401,{error:'Sign in again'});
    let body;
    try {body=typeof req.body === 'string' ? JSON.parse(req.body) : req.body;} catch {return send(400,{error:'Invalid request'});}
    const fields = {status:['action'],import:['action','contacts'],templates:['action','templates'],configure:['action','active'],exclude:['action','emails']};
    if (!body || !Object.hasOwn(fields,body.action) || JSON.stringify(body).length>500000 || Object.keys(body).some(k=>!fields[body.action].includes(k))) return send(400,{error:'Invalid request'});
    try {
      const result = body.action === 'status' ? await service.status(user.id)
        : body.action === 'import' ? await service.import(user.id,body.contacts)
        : body.action === 'templates' ? await service.templates(user.id,body.templates)
        : body.action === 'exclude' ? await service.exclude(user.id,body.emails)
        : await service.configure(user.id,body.active);
      return send(200,result);
    } catch {return send(409,{error:'Outreach is unavailable or this change is not allowed. Check your Gmail connection, campaign state and server setup.'});}
  };
}
