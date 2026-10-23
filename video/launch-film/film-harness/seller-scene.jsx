// Film-only state around the actual product filter, table-row and seller drawer.
import { useEffect, useState } from 'react';
import SellerFilterBar from '../../../src/features/seller-signal/components/SellerFilterBar.jsx';
import LeadCard from '../../../src/features/seller-signal/components/LeadCard.jsx';
import LeadModal from '../../../src/features/seller-signal/components/LeadModal.jsx';
import { applyAccountStatuses } from '../../../src/features/seller-signal/status-registry.js';

const rows = [
  ['Oliver Grant','Burj Khalifa','Prospect','prospect',true],
  ['Fatima Al-Mansoori','Opera Grand','Market Appraisal','market_appraisal',true],
  ['James Chen','Forte 2','For Sale Available','for_sale_available',true],
  ['Sarah Williams','Act One','Prospect','prospect',true],
  ['Maria Gonzalez','Boulevard Point','Prospect','prospect',true],
  ['David Park','Opera Grand','For Sale Available','for_sale_available',true],
  ['Layla Khalil','Forte 2','Market Appraisal','market_appraisal',true],
  ['Nadia Rahman','Burj Khalifa','Prospect','prospect',true],
  ['Adam Bennett','Burj Khalifa','Prospect','prospect',false],
  ['Rohan Mehta','Forte 2','Market Appraisal','market_appraisal',false],
  ['Lina Haddad','Act One','For Sale Available','for_sale_available',false],
];
const seed = rows.map(([name,building,status,id,isDue],i)=>({
  id:`film-seller-${i}`,name,building,status,statusLabel:status.replace('Market ','').replace(' Available',''),
  statusRule:{id},isDue,dueLabel:isDue?'Due today':'In 2 weeks',unit:String(1201+i*103),bedroom:String(i%3+1),
  phone:`+9715000000${String(i).padStart(2,'0')}`,notes:'',last_contact:null,
  message_draft:`Hi ${name.split(' ')[0]}, here is the latest sales update for ${building}.`,
  dataQuality:{level:'complete',issues:[]},
}));
const buildings=[...new Set(seed.map(row=>row.building))].map(label=>({key:label,label,count:seed.filter(row=>row.building===label).length}));
const custom={id:'film-hot-lead',label:'Hot Lead',color:'#e8733a',follow_up_days:14,position:0};

export default function SellerScene(){
  const [leads,setLeads]=useState(seed);
  const [filters,setFilters]=useState({statusFilter:[],buildingFilter:[],bedFilter:[],sourceFilter:'all',dataFilter:'all',dataQualityFilter:'all',searchTerm:'',viewTab:'active'});
  const [sortOption,setSortOption]=useState({field:'name',direction:'asc'});
  const [selectedId,setSelectedId]=useState(null);
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(null);
  useEffect(()=>{applyAccountStatuses(new URLSearchParams(location.search).has('assign')?[custom]:[]);},[]);
  const update=(key,value)=>setFilters(previous=>({...previous,[key]:value}));
  const visible=leads.filter(lead=>
    (filters.viewTab==='done'?!lead.isDue:lead.isDue)
    &&(!filters.statusFilter.length||filters.statusFilter.includes(lead.statusRule.id))
    &&(!filters.buildingFilter.length||filters.buildingFilter.includes(lead.building))
    &&(!filters.bedFilter.length||filters.bedFilter.includes(lead.bedroom))
    &&(!filters.searchTerm||`${lead.name} ${lead.building} ${lead.phone}`.toLowerCase().includes(filters.searchTerm.toLowerCase())));
  const actions={
    selectStatusFilter:value=>update('statusFilter',value),selectBuildingFilter:value=>update('buildingFilter',value),
    selectBedFilter:value=>update('bedFilter',value),selectSourceFilter:value=>update('sourceFilter',value),
    selectDataFilter:value=>update('dataFilter',value),selectDataQualityFilter:value=>update('dataQualityFilter',value),
    updateSearchTerm:value=>update('searchTerm',value),selectViewTab:value=>update('viewTab',value),
  };
  const dashboard={...filters,sortOption,setSortOption,actions,buildingOptions:buildings,sourceOptions:[{id:'film-sheet',label:'Downtown Owners'}]};
  useEffect(()=>{Object.defineProperty(window,'__filmSellerState',{configurable:true,get:()=>({leads,filters,visible:visible.map(lead=>lead.id)})});},[leads,filters,visible]);
  const selected=leads.find(lead=>lead.id===selectedId);
  const open=id=>{const lead=leads.find(row=>row.id===id);setSelectedId(id);setEditing(false);setDraft({...lead,lastContact:''});};
  const save=()=>{
    setLeads(previous=>previous.map(lead=>lead.id!==selectedId?lead:{...lead,...draft,statusLabel:draft.status==='Hot Lead'?'Hot Lead':draft.status.replace('Market ','').replace(' Available',''),statusRule:draft.status==='Hot Lead'?{id:'custom:film-hot-lead',color:custom.color}:lead.statusRule}));
    setSelectedId(null);setEditing(false);
  };
  return <main className="seller-signal-dashboard" style={{padding:'32px 48px',minHeight:'100vh',boxSizing:'border-box'}}>
    <div className="seller-page-head">
      <div className="seller-view-switch" role="tablist" aria-label="Sellers">
        {['active','done'].map(tab=><button key={tab} type="button" role="tab" aria-selected={filters.viewTab===tab} className={filters.viewTab===tab?'is-active':''} onClick={()=>update('viewTab',tab)}>{tab==='active'?'Due today':'Scheduled'}<span>{leads.filter(lead=>tab==='active'?lead.isDue:!lead.isDue).length}</span></button>)}
      </div>
    </div>
    <div className="seller-table-surface">
      <SellerFilterBar dashboard={dashboard} userId="film-user"/>
      <div className="seller-table-card">
        <div className="seller-table-meta">{visible.length} seller{visible.length===1?'':'s'}</div>
        <div className="seller-table-scroll"><table className="seller-table">
          <thead><tr>{['Seller','Building','Unit','Bedrooms','Status','Follow-up','Phone','Contact',''].map((label,i)=><th key={i}>{label}</th>)}</tr></thead>
          <tbody>{visible.map(lead=><LeadCard key={lead.id} lead={lead} insight={{status:'ready',recentTransactions:[{price:2500000}]}} whatsappConnected onToggleExpanded={open} onSendWhatsApp={()=>{}} onCopyMessage={()=>{}}/>)}</tbody>
        </table></div>
        {!visible.length&&<div className="seller-table-empty">No sellers match these filters.</div>}
      </div>
    </div>
    {selected&&<LeadModal key={selected.id} userId="film-user" lead={selected}
      insight={{status:'ready',recentTransactions:[],message:selected.message_draft}}
      editDraft={draft} isEditing={editing} isSaving={false} isDeleting={false} whatsappConnected
      onStartEditing={()=>setEditing(true)} onCancelEditing={()=>setEditing(false)}
      onClose={()=>setSelectedId(null)}
      onEditFieldChange={(key,value)=>setDraft(previous=>({...previous,[key]:value}))}
      onSaveEdit={save} onSaveNotes={async()=>{}} onSaveMessage={async()=>{}}
      onSaveFollowUp={async()=>{}} onSendWhatsApp={()=>{}}/>}
  </main>;
}
