import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, ShieldAlert, Power, UserCog, MoreVertical, Plus, Activity, Ban, CheckCircle, Trash2, X } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

function Badge({ children, className }: any) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </div>
  );
}

export default function AdminPanel() {
  const { t, language } = useLanguage();
  const { data: users, refetch } = trpc.admin.getUsers.useQuery();
  
  const updateSub = trpc.admin.updateSubscription.useMutation({ onSuccess: () => { refetch(); toast.success("Access Level Updated"); } });
  const stopBot = trpc.admin.forceStopBot.useMutation({ onSuccess: () => { refetch(); toast.success("Engine Shutdown Execution Confirmed"); } });
  const addUser = trpc.admin.addUser.useMutation({ onSuccess: () => { refetch(); toast.success("New node added to network"); setShowAddUser(false); setNewUser({name:'', email:'', plan:'pro'}); } });
  const updateUserStatus = trpc.admin.updateUserStatus.useMutation({ onSuccess: () => { refetch(); toast.success("User status updated"); } });

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', plan: 'pro' });

  const [viewActivitiesFor, setViewActivitiesFor] = useState<string | null>(null);
  const { data: userActivities } = trpc.admin.getUserActivities.useQuery({ userId: viewActivitiesFor || '' }, { enabled: !!viewActivitiesFor });

  const [viewInvoicesFor, setViewInvoicesFor] = useState<string | null>(null);
  const { data: userInvoices, refetch: refetchInvoices } = trpc.admin.getUserInvoices.useQuery({ userId: viewInvoicesFor || '' }, { enabled: !!viewInvoicesFor });
  const markInvoicePaid = trpc.admin.markInvoicePaid.useMutation({ onSuccess: () => { refetchInvoices(); toast.success("Invoice marked as paid"); } });

  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    active: 'text-primary bg-emerald-500/10 border-emerald-500/20',
    suspended: 'text-primary bg-amber-500/10 border-amber-500/20',
    deactivated: 'text-primary bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary italic tracking-tighter uppercase">{t('master' as any)} <span className="text-primary">{t('terminal' as any)}</span></h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{t('masterTerminalDesc' as any)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => {
              const trialToken = Math.random().toString(36).substring(2, 12).toUpperCase();
              const link = `${window.location.origin}/?trial=${trialToken}`;
              if (navigator.share) {
                navigator.share({
                  title: 'AuraBot - Trial Invitation',
                  text: 'You have been invited to a trial of AuraBot Trading.',
                  url: link,
                }).catch(() => {
                  navigator.clipboard.writeText(link);
                  toast.success(`Trial Invitation Link Copied: ${link}`);
                });
              } else {
                navigator.clipboard.writeText(link);
                toast.success(`Trial Invitation Link Copied: ${link}`);
              }
            }} 
            className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 font-black uppercase tracking-widest text-[10px] h-12 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
             Invite for Trial
          </Button>
          <Button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'AuraBot - Master Terminal',
                  text: 'Check out the AuraBot Trading interface.',
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success('App URL copied to clipboard');
              }
            }} 
            className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 font-black uppercase tracking-widest text-[10px] h-12 border border-purple-500/20"
          >
             Share App
          </Button>
          <Button onClick={() => setShowAddUser(true)} className="bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest text-[10px] h-12 mr-4">
             <Plus className="w-4 h-4 mr-2" /> Add Node
          </Button>
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-center flex flex-col justify-center">
            <p className="text-[8px] font-black text-gray-500 uppercase">{t('activeNodes' as any)}</p>
            <p className="text-xl font-black text-primary leading-none">{users?.filter((u:any) => u.status === 'active').length || 0} / {users?.length || 0}</p>
          </div>
          <div className="px-4 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-center flex flex-col justify-center">
            <p className="text-[8px] font-black text-gray-500 uppercase">{t('networkHealth' as any)}</p>
            <p className="text-xl font-black text-primary leading-none">99.8%</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {users?.map((user: any) => (
          <Card key={user.id} className={cn("bg-black/40 border-white/5 hover:border-white/10 transition-all group overflow-visible relative", user.status === 'deactivated' ? 'opacity-50' : '')}>
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative z-10 w-full overflow-visible">
              <div className="flex items-center justify-between flex-wrap gap-6 w-full">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-xl font-black text-primary">
                      {user.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-primary tracking-tight uppercase">{user.name}</h3>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0",
                        user.subscriptionPlan === 'elite' ? "text-primary border-amber-500/20 bg-amber-500/5" : "text-primary border-blue-500/20 bg-blue-500/5"
                      )}>
                        {language === 'ar' ? (user.subscriptionPlan === 'elite' ? t('elite' as any) : t('professional' as any)) : user.subscriptionPlan}
                      </Badge>
                      <Badge className={cn("px-2 py-0 ml-2", statusColors[user.status] || statusColors.active)}>
                        {user.status || 'active'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 md:gap-12 pl-4">
                  <div className="text-center hidden md:block">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('engineState' as any)}</p>
                    <div className="flex items-center gap-2 justify-center">
                       <div className={cn("w-2 h-2 rounded-full", user.bots?.[0]?.status === 'running' ? "bg-emerald-500 animate-pulse" : "bg-slate-700")} />
                       <span className={cn("text-xs font-black uppercase tracking-widest", user.bots?.[0]?.status === 'running' ? "text-primary" : "text-gray-500")}>
                         {t((user.bots?.[0]?.status as any) || 'stopped')}
                       </span>
                    </div>
                  </div>
                  
                  <div className="text-center hidden lg:block">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Billing Loop</p>
                    <div className="flex items-center gap-2 justify-center">
                       <ShieldCheck className={cn("w-3 h-3", user.autoBilling ? "text-emerald-500" : "text-amber-500")} />
                       <span className={cn("text-xs font-black uppercase tracking-widest", user.autoBilling ? "text-primary" : "text-gray-500")}>
                         {user.autoBilling ? "AUTO-SYNCED" : "MANUAL"}
                       </span>
                    </div>
                  </div>
                  
                  <div className="text-center hidden lg:block">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Unpaid Fees</p>
                    <div className="flex items-center justify-center">
                       <span className={cn("text-xs font-black uppercase tracking-widest tabular-nums", user.owedFees > 0 ? "text-rose-500" : "text-gray-500")}>
                         ${f(user.owedFees || 0)}
                       </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/5 bg-white/5 hover:bg-emerald-500/10 hover:text-primary hover:border-emerald-500/20 text-gray-400 h-10 px-3 md:px-4 rounded-xl text-[9px] md:text-sm font-bold tracking-wider"
                      onClick={() => setViewActivitiesFor(user.id)}
                    >
                      <Activity className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Activities</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/5 bg-white/5 hover:bg-amber-500/10 hover:text-primary hover:border-amber-500/20 text-gray-400 h-10 px-3 md:px-4 rounded-xl text-[9px] md:text-sm font-bold tracking-wider"
                      onClick={() => setViewInvoicesFor(user.id)}
                    >
                      <span className="hidden md:inline">Invoices</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/5 bg-white/5 hover:bg-rose-500/10 hover:text-primary hover:border-rose-500/20 text-gray-400 h-10 px-3 md:px-4 rounded-xl text-[9px] md:text-sm font-bold tracking-wider"
                      onClick={() => stopBot.mutate({ userId: user.id })}
                    >
                      <Power className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">{t('terminate' as any)}</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="text-gray-600 hover:text-primary relative" onClick={() => setExpandedMenuId(expandedMenuId === user.id ? null : user.id)}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    
                    {expandedMenuId === user.id && (
                       <div className="absolute top-12 right-0  bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[200px] z-[50] flex flex-col gap-1">
                          <button onClick={() => { updateSub.mutate({ userId: user.id, plan: user.subscriptionPlan === 'elite' ? 'pro' : 'elite' }); setExpandedMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-blue-500/10 rounded-lg transition-colors">
                             <UserCog className="w-3 h-3" /> Toggle Subscription
                          </button>
                          {user.status !== 'active' && (
                            <button onClick={() => { updateUserStatus.mutate({ userId: user.id, status: 'active' }); setExpandedMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-emerald-500/10 rounded-lg transition-colors">
                               <CheckCircle className="w-3 h-3" /> Activate Node
                            </button>
                          )}
                          {user.status !== 'suspended' && (
                            <button onClick={() => { updateUserStatus.mutate({ userId: user.id, status: 'suspended' }); setExpandedMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-amber-500/10 rounded-lg transition-colors">
                               <Ban className="w-3 h-3" /> Suspend Node
                            </button>
                          )}
                          {user.status !== 'deactivated' && (
                            <button onClick={() => { updateUserStatus.mutate({ userId: user.id, status: 'deactivated' }); setExpandedMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-rose-500/10 rounded-lg transition-colors">
                               <Trash2 className="w-3 h-3" /> Deactivate Node
                            </button>
                          )}
                       </div>
                    )}

                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!users || users.length === 0) && (
          <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-3xl">
             <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
             <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">{t('waitingNetwork' as any)}</p>
          </div>
        )}
      </div>

      {showAddUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0b0e14] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button className="absolute top-6 right-6 text-gray-500 hover:text-primary" onClick={() => setShowAddUser(false)}>
                 <X className="w-5 h-5"/>
              </button>
              <h2 className="text-xl font-black text-primary uppercase tracking-wider mb-6">Initialize New Node</h2>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                    <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-primary font-mono text-sm outline-none focus:border-blue-500/50" placeholder="e.g. John Doe" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-primary font-mono text-sm outline-none focus:border-blue-500/50" placeholder="john@example.com" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Access Tier</label>
                    <div className="flex gap-2">
                       <Button variant={newUser.plan === 'pro' ? 'default' : 'outline'} className={newUser.plan === 'pro' ? 'bg-blue-600 hover:bg-blue-700 flex-1' : 'border-white/10 text-gray-400 flex-1'} onClick={() => setNewUser({...newUser, plan: 'pro'})}>Professional</Button>
                       <Button variant={newUser.plan === 'elite' ? 'default' : 'outline'} className={newUser.plan === 'elite' ? 'bg-amber-600 hover:bg-amber-700 flex-1 text-primary' : 'border-white/10 text-gray-400 flex-1'} onClick={() => setNewUser({...newUser, plan: 'elite'})}>Elite</Button>
                    </div>
                 </div>
                 
                 <div className="pt-4">
                    <Button 
                       className="w-full bg-white text-black hover:bg-slate-200 font-black uppercase tracking-widest text-xs h-12"
                       disabled={!newUser.name || !newUser.email}
                       onClick={() => addUser.mutate(newUser)}
                    >
                       Deploy Node
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {viewActivitiesFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0b0e14] border border-white/10 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative h-[70vh] flex flex-col">
              <button className="absolute top-6 right-6 text-gray-500 hover:text-primary" onClick={() => setViewActivitiesFor(null)}>
                 <X className="w-5 h-5"/>
              </button>
              <h2 className="text-lg font-black text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
                 <Activity className="w-5 h-5 text-primary" />
                 Node Activity Logs
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px] custom-scrollbar pr-2">
                {!userActivities ? (
                   <div className="text-center text-gray-500 py-12 animate-pulse uppercase tracking-widest">Decrypting logs...</div>
                ) : userActivities.length === 0 ? (
                   <div className="text-center text-gray-500 py-12 uppercase tracking-widest">No activities recorded</div>
                ) : (
                   userActivities.map((log: any) => (
                    <div key={log.id} className="flex gap-4 text-primary/90 bg-white/[0.02] p-3 rounded-lg border border-white/5 items-center">
                       <span className="text-gray-500 min-w-[80px]">
                         {new Date(log.timestamp).toLocaleTimeString()}
                       </span>
                       <span className={cn(
                          "font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[9px]",
                          log.level === 'warning' ? 'bg-amber-500/20 text-primary' :
                          log.level === 'error' ? 'bg-rose-500/20 text-primary' :
                          'bg-blue-500/20 text-primary'
                       )}>
                         {log.category || log.level}
                       </span>
                       <span className="flex-1 opacity-90">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

      {viewInvoicesFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0b0e14] border border-white/10 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative h-[70vh] flex flex-col">
              <button className="absolute top-6 right-6 text-gray-500 hover:text-primary" onClick={() => setViewInvoicesFor(null)}>
                 <X className="w-5 h-5"/>
              </button>
              <h2 className="text-lg font-black text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
                 <span className="text-primary">$</span>
                 Trading Fee Invoices
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-2 font-mono custom-scrollbar pr-2">
                {!userInvoices ? (
                   <div className="text-center text-gray-500 py-12 animate-pulse uppercase tracking-widest text-xs">Loading Invoices...</div>
                ) : userInvoices.length === 0 ? (
                   <div className="text-center text-gray-500 py-12 uppercase tracking-widest text-xs">No invoices generated yet</div>
                ) : (
                   userInvoices.map((inv: any) => (
                    <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-primary/90 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="font-black text-primary">INV-{inv.id.toUpperCase()}</span>
                           <span className={cn(
                              "font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[8px]",
                              inv.status === 'paid' ? 'bg-emerald-500/20 text-primary' : 'bg-amber-500/20 text-primary'
                           )}>
                             {inv.status}
                           </span>
                         </div>
                         <p className="text-xs text-gray-400">{inv.reason} - {new Date(inv.date).toLocaleDateString()}</p>
                       </div>
                       <div className="flex items-center gap-4">
                         <span className="text-lg font-black text-primary">${inv.amount}</span>
                         {inv.status === 'pending' && (
                           <Button size="sm" onClick={() => markInvoicePaid.mutate({ userId: viewInvoicesFor, invoiceId: inv.id })} className="bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-wider h-8">
                             Mark Paid
                           </Button>
                         )}
                       </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
}