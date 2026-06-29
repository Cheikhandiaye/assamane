// Au lieu de :
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', ...)
    .subscribe();

  return () => channel.unsubscribe();
}, []);

// Utilisez :
useEffect(() => {
  const channel = supabase
    .channel(`notifications_${user?.id}`)
    .on('postgres_changes', ...)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Realtime notifications souscrit');
      }
    });

  return () => {
    channel.unsubscribe();
  };
}, [user?.id]);
