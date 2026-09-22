"""Original procedural launch-film scene. Run with Blender 4.5 in background."""
import bpy, math, os, sys, random
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'video/assets/launch/blender'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(18)

def mat(name, color, metallic=0, roughness=.4):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    s=m.node_tree.nodes.get('Principled BSDF'); s.inputs['Base Color'].default_value=(*color,1)
    s.inputs['Metallic'].default_value=metallic; s.inputs['Roughness'].default_value=roughness
    return m

aluminium=mat('Fine bead-blasted graphite aluminium',(.23,.25,.24),.83,.29)
rim=mat('Diamond-cut titanium rim',(.43,.46,.45),.92,.22)
black=mat('Deep charcoal keyboard polymer',(.026,.03,.028),.1,.38)
glass=mat('Obsidian polished screen surround',(.009,.014,.012),.25,.15)
sage=mat('Sage book cloth',(.26,.34,.27),0,.8)
paper=mat('Warm architectural paper',(.86,.82,.72),0,.86)
ink=mat('Muted technical drafting ink',(.23,.31,.29),0,.7)
ceramic=mat('Glazed ivory porcelain',(.71,.69,.61),0,.22)
coffee=mat('Espresso crema',(.105,.042,.012),0,.19)
gold=mat('Brushed champagne brass',(.47,.32,.15),.85,.26)
desk=mat('Honed warm limestone',(.64,.6,.49),0,.8)
# Fine stone pores; deliberately subtle enough to keep the product the focus.
ns=desk.node_tree.nodes; links=desk.node_tree.links
n=ns.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value=125; n.inputs['Detail'].default_value=2
b=ns.new('ShaderNodeBump'); b.inputs['Strength'].default_value=.16; b.inputs['Distance'].default_value=.017
links.new(n.outputs['Fac'], b.inputs['Height']); links.new(b.outputs['Normal'],ns.get('Principled BSDF').inputs['Normal'])

def box(name, loc, dims, material, bevel=.05, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Machined soft edge','BEVEL'); mod.width=bevel; mod.segments=5
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    o.data.materials.append(material)
    if parent: o.parent=parent
    return o

def cyl(name,loc,radius,depth,material,parent=None,vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(material)
    bevel=o.modifiers.new('Edge radius','BEVEL'); bevel.width=.012; bevel.segments=3
    o.modifiers.new('Smooth normals','WEIGHTED_NORMAL')
    if parent:o.parent=parent
    return o

def rounded_face_body(name,loc,width,depth,height,radius,material,parent):
    perimeter=[]
    for cx,cz,start in [(width/2-radius,-height/2+radius,-90),(width/2-radius,height/2-radius,0),(-width/2+radius,height/2-radius,90),(-width/2+radius,-height/2+radius,180)]:
        for step in range(13):
            a=math.radians(start+step*90/12);perimeter.append((cx+radius*math.cos(a),cz+radius*math.sin(a)))
    count=len(perimeter);verts=[(x,y,z) for y in [-depth/2,depth/2] for x,z in perimeter]
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;o.data.materials.append(material)
    mod=o.modifiers.new('Fine edge polish','BEVEL');mod.width=.005;mod.segments=3;o.modifiers.new('Weighted smooth normals','WEIGHTED_NORMAL')
    return o

def empty(name,loc=(0,0,0),rot=(0,0,0)):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.location=loc; o.rotation_euler=rot; return o

def image_screen(name,path,width,height,loc,parent,radius=0):
    m=bpy.data.materials.new(name+' exact UI texture'); m.use_nodes=True
    nodes=m.node_tree.nodes; nodes.clear()
    tex=nodes.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(str(path),check_existing=True); tex.image.pack()
    emission=nodes.new('ShaderNodeEmission'); emission.inputs['Strength'].default_value=.8
    out=nodes.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(tex.outputs['Color'],emission.inputs['Color']); m.node_tree.links.new(emission.outputs[0],out.inputs[0])
    # Front is -Y. Explicit UVs preserve screenshots without mirrors or vertical flips.
    verts=[]
    if radius:
        for cx,cz,start in [(width/2-radius,-height/2+radius,-90),(width/2-radius,height/2-radius,0),(-width/2+radius,height/2-radius,90),(-width/2+radius,-height/2+radius,180)]:
            for step in range(13):
                a=math.radians(start+step*90/12);verts.append((cx+radius*math.cos(a),0,cz+radius*math.sin(a)))
    else:verts=[(-width/2,0,-height/2),(width/2,0,-height/2),(width/2,0,height/2),(-width/2,0,height/2)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],[tuple(range(len(verts)))])
    mesh.uv_layers.new()
    for loop,v in zip(mesh.uv_layers.active.data,verts):loop.uv=(v[0]/width+.5,v[2]/height+.5)
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); o.location=loc; o.parent=parent; o.data.materials.append(m)
    return o

def text(name,value,loc,size,material,rot=(0,0,0),parent=None):
    curve=bpy.data.curves.new(name,'FONT'); curve.body=value; curve.size=size; curve.align_x='CENTER'; curve.align_y='CENTER'; curve.extrude=.0001
    ob=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(ob); ob.location=loc; ob.rotation_euler=rot; ob.data.materials.append(material)
    if parent:ob.parent=parent
    return ob

# Seamless studio room and the substantial stone desk slab.
box('Solid honed limestone desk',(0,0,-.23),(25,22,.45),desk,.12)
back=mat('Warm ivory studio',(.63,.67,.57),0,.9)
box('Distant sage wall',(0,7,4),(100,.3,30),back,.03)

laptop=empty('Laptop assembly',(-.6,.3,.12),(0,0,math.radians(-5)))
box('Unibody lower chassis',(0,0,.12),(4.8,3.15,.22),aluminium,.11,laptop)
box('Lower edge reveal',(0,0,.017),(4.65,3.02,.035),black,.06,laptop)
box('Keyboard recessed tray',(0,.35,.236),(4.12,1.72,.034),black,.075,laptop)
def key(label,x,y,w=.238,h=.225,legend_size=.069):
    box('Sculpted key '+label,(x,y,.28),(w,h,.053),black,.023,laptop)
    if label:text('Key legend '+label,label,(x,y,.309),legend_size,paper,parent=laptop)

def keyrow(y,items):
    unit=.266;total=sum(w for _,w in items)*unit;x=-total/2
    for label,width in items:
        real=width*unit-.023
        if label != '{arrows}':key(label,x+width*unit/2,y,real,legend_size=.051 if len(label)>1 else .076)
        x+=width*unit

keyrow(.845,[(c,1) for c in '`1234567890-=']+[('delete',1.65)])
keyrow(.565,[('tab',1.4)]+[(c,1) for c in 'QWERTYUIOP[]']+[('\\',1.25)])
keyrow(.285,[('caps',1.7)]+[(c,1) for c in 'ASDFGHJKL;\'']+[('return',1.95)])
keyrow(.005,[('shift',2.15)]+[(c,1) for c in 'ZXCVBNM,./']+[('shift',2.5)])
for i,label in enumerate(['esc']+['F'+str(i) for i in range(1,13)]+['lock']):
    key(label,(i-6.5)*.276,1.103,.251,.16,.048)
keyrow(-.285,[('fn',1),('ctrl',1),('option',1),('cmd',1.35),('',4.1),('cmd',1.35),('option',1),('{arrows}',2.85)])
# The inverted-T arrow cluster has separate keycaps and engraved directional chevrons.
for x,y,label in [(1.423,-.357,'<'),(1.683,-.357,'v'),(1.943,-.357,'>'),(1.683,-.219,'^')]:
    key(label,x,y,.236,.115,.06)
box('Precision trackpad seam',(0,-1.01,.239),(1.62,.82,.01),black,.065,laptop)
box('Glass haptic trackpad',(0,-1.01,.247),(1.596,.795,.012),aluminium,.055,laptop)
for side in [-1,1]:
    for i in range(20):
        for j in range(3):
            cyl('Speaker micro perforation',(side*2.18+j*.028,.92-i*.073,.24),.006,.004,black,laptop,12)
    port=box('USB C port',(side*2.395,.55,.13),(.013,.2,.047),black,.012,laptop)
hinge=cyl('Continuous hinge',(0,1.28,.25),.09,4.15,aluminium,laptop);hinge.rotation_euler[1]=math.pi/2
lid=empty('Open laptop lid',(0,1.27,.29),(math.radians(-12),0,0));lid.parent=laptop
box('Screen lid machined back',(0,.015,1.44),(4.8,.13,2.89),aluminium,.09,lid)
box('Continuous black display bezel',(0,-.059,1.44),(4.62,.018,2.72),glass,.075,lid)
image_screen('Repeat AI desktop real Listings',ROOT/'video/assets/accurate/public/01-buildings.png',4.4,2.475,(0,-.071,1.43),lid)
camera_lens=cyl('Laptop camera',(0,-.073,2.795),.026,.01,glass,lid);camera_lens.rotation_euler[0]=math.pi/2
text('Laptop lower bezel brand','REPEAT AI',(0,-.073,.082),.042,paper,(math.pi/2,0,0),lid)

phone=empty('Titanium phone assembly',(2.79,-.25,.14),(math.radians(-8),0,math.radians(-11)))
rounded_face_body('Phone bead blasted titanium body',(0,0,1.49),1.46,.135,3.04,.145,rim,phone)
rounded_face_body('Phone black ceramic glass',(0,-.072,1.49),1.415,.018,2.986,.128,glass,phone)
image_screen('Repeat AI native iPhone real Listings',ROOT/'video/assets/accurate/public/native-iphone.png',1.334,2.888,(0,-.084,1.49),phone,.075)
rounded_face_body('Phone camera island',(0,-.087,2.864),.32,.007,.07,.034,glass,phone)
box('Rear ceramic camera platform',(-.29,.081,2.54),(.7,.058,.71),aluminium,.095,phone)
for xx,zz in [(-.46,2.7),(-.46,2.36),(-.1,2.53)]:
    ring=cyl('Rear machined camera ring',(xx,.135,zz),.135,.071,rim,phone);ring.rotation_euler[0]=math.pi/2
    lens=cyl('Rear sapphire optic',(xx,.177,zz),.111,.014,glass,phone);lens.rotation_euler[0]=math.pi/2
for z in [.34,2.59]:
    for x in [-.732,.732]:box('Phone antenna band',(x,0,z),(.008,.117,.022),paper,.003,phone)
# Fine details modelled even where the hero camera only catches their edge.
box('Phone power button',(.738,0,1.88),(.035,.063,.32),rim,.013,phone)
for h in [1.81,2.19]:box('Phone volume button',(-.738,0,h),(.035,.063,.23),rim,.013,phone)
for x in [-.55,-.49,-.43,.43,.49,.55]:
    g=cyl('Phone bottom speaker',(x,0,-.024),.013,.009,black,phone,16)
box('Phone USB C socket',(0,0,-.025),(.21,.063,.008),black,.012,phone)
# Dark sage support, small and physically believable.
box('Phone folded stand foot',(2.81,.12,.055),(1.19,.91,.1),sage,.055)
support=box('Phone stand rear support',(2.83,.49,.86),(1.04,.12,1.65),sage,.04); support.rotation_euler[0]=math.radians(-10)

# Architectural notebook and a finely machined pen add real desk context.
book=empty('Architect notebook',(-3.44,-.28,.055),(0,0,math.radians(10)))
box('Notebook cloth cover',(0,0,.067),(1.61,2.14,.1),sage,.035,book)
box('Notebook visible paper block',(0,0,.126),(1.54,2.07,.07),paper,.013,book)
box('Notebook top cover',(0,0,.173),(1.61,2.14,.04),sage,.035,book)
text('Deboss notebook title','FIELD NOTES',(0,.36,.196),.097,paper,parent=book)
text('Notebook year','REPEAT AI',(0,.13,.196),.047,paper,parent=book)
pen=cyl('Brass pen barrel',(-3.12,-.08,.27),.039,1.7,gold);pen.rotation_euler=(math.pi/2,0,math.radians(-9))
for yy in [-.77,.7]:
    ring=cyl('Pen polished band',(-3.12,yy,.27),.044,.039,rim);ring.rotation_euler[0]=math.pi/2

# Double-wall porcelain espresso cup, hollow opening, handle and ceramic saucer.
saucer=cyl('Espresso saucer',(3.25,2.25,.06),.55,.08,ceramic)
bpy.ops.mesh.primitive_torus_add(major_radius=.31,minor_radius=.035,major_segments=80,minor_segments=16,location=(3.25,2.25,.67));bpy.context.object.name='Porcelain rolled cup rim';bpy.context.object.data.materials.append(ceramic)
cup=cyl('Espresso cup wall',(3.25,2.25,.36),.335,.59,ceramic)
liquid=cyl('Visible espresso surface',(3.25,2.25,.677),.277,.012,coffee)
bpy.ops.mesh.primitive_torus_add(major_radius=.185,minor_radius=.042,major_segments=64,minor_segments=16,location=(3.61,2.25,.39),rotation=(math.pi/2,0,0));bpy.context.object.name='Porcelain loop handle';bpy.context.object.data.materials.append(ceramic)

# Light slatted shadows suggest a real architectural space.
for i in range(5):box('Window frame shadow slat '+str(i),(-5.8+i*.7,3,6.9),(.085,8,.12),back,.01)

def area(name,loc,power,color,size,target):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm window',(-4,-3,8),1800,(1,.88,.69),5,(0,0,0))
area('Cool soft sky fill',(5,-1,6),1000,(.8,.9,1),4,(0,0,1))
area('Rear edge strip',(0,5,6),2000,(1,.93,.8),3,(0,0,1))
scene=bpy.context.scene;scene.world.color=(.16,.16,.16)
bpy.ops.object.camera_add(location=(7.7,-11.6,7.6));cam=bpy.context.object;cam.name='Slow architectural dolly';scene.camera=cam;cam.data.lens=48
target=empty('Camera focus target',(.1,.25,1.2))
constraint=cam.constraints.new(type='TRACK_TO');constraint.target=target;constraint.track_axis='TRACK_NEGATIVE_Z';constraint.up_axis='UP_Y'
for frame,loc,lens in [(1,(7.7,-11.6,7.6),48),(210,(5.3,-11.0,6.7),48)]:
    cam.location=loc;cam.keyframe_insert(data_path='location',frame=frame);cam.data.lens=lens;cam.data.keyframe_insert(data_path='lens',frame=frame)
cam.data.dof.use_dof=True;cam.data.dof.focus_object=target;cam.data.dof.aperture_fstop=7.1
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'
scene.cycles.device='GPU'
scene.cycles.denoiser='OPTIX'
scene.render.use_persistent_data=True
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.render.fps=30;scene.frame_start=1;scene.frame_end=210
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False
scene.frame_set(110)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'repeat-desk.blend'))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if 'preview' in args:
    scene.render.resolution_percentage=50;scene.cycles.samples=16;scene.render.filepath=str(OUT/'hero-preview.png');bpy.ops.render.render(write_still=True)
elif 'hero' in args:
    scene.cycles.samples=96;scene.render.filepath=str(OUT/'hero.png');bpy.ops.render.render(write_still=True)
elif 'animation' in args:
    scene.render.filepath=str(OUT/'frames-final/frame-');bpy.ops.render.render(animation=True)
