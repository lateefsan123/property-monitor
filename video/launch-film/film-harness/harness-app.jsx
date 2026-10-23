import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import SettingsPage from '../../../src/features/settings/SettingsPage.jsx';
import SellerScene from './seller-scene.jsx';
import TemplatesScene from './templates-scene.jsx';
import '../../../src/App.css';
import '../../../src/features/settings/settings-page.css';
import '../../../src/styles/settings-connection-first.css';

const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
const scene=new URLSearchParams(location.search).get('scene')||'filters';
function App(){
  return <QueryClientProvider client={client}>{scene==='templates'?<TemplatesScene/>:scene==='settings'
    ? <SettingsPage userId="film-user" initialSection="automations" theme="dark" onToggleTheme={()=>{}} subscription={{source:'stripe',status:'active'}}/>
    : <SellerScene/>}</QueryClientProvider>;
}
createRoot(document.getElementById('root')).render(<App/>);
