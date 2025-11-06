import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarView, type CalendarEvent } from './CalendarView';
import { format } from 'date-fns';

// Data Fetching Function
async function getCalendarData() {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Get scheduled posts (exclude failed posts from calendar)
    const { data: posts, error: postsError } = await supabase
      .from('gmb_posts')
      .select(`
        *,
        gmb_locations (
          location_name
        )
      `)
      .eq('user_id', user.id)
      .not('scheduled_at', 'is', null)
      .neq('status', 'failed') // Exclude failed posts from calendar
      .order('scheduled_at', { ascending: true });
    
    if (postsError) {
      console.error('Posts fetch error:', postsError);
    }
    
    // Get AI tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('weekly_task_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (tasksError) {
      console.error('Tasks fetch error:', tasksError);
    }
    
    // Transform to calendar events
    const postEvents: CalendarEvent[] = (posts || [])
      .filter((post: any) => post.status !== 'failed') // Additional safety filter
      .map((post: any): CalendarEvent => {
        // Map post status to calendar event status with explicit type
        const eventStatus = (post.status === 'published' ? 'published' : 'scheduled') as 'scheduled' | 'published';
        
        return {
          id: post.id,
          title: post.title || 'GMB Post',
          description: post.content,
          date: new Date(post.scheduled_at),
          type: 'post' as const,
          status: eventStatus,
          location: post.gmb_locations?.location_name,
          metadata: post
        };
      });
    
    const taskEvents: CalendarEvent[] = (tasks || []).map((task: any): CalendarEvent => {
      const taskStatus = (task.status === 'completed' ? 'completed' : 'pending') as 'pending' | 'completed';
      return {
        id: task.id,
        title: task.title || 'AI Task',
        description: task.description,
        date: new Date(task.week_start_date || task.created_at),
        type: 'task' as const,
        status: taskStatus,
        metadata: task
      };
    });
    
    const events: CalendarEvent[] = [...postEvents, ...taskEvents];
    
    return events;
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return [];
  }
}

// Main Component
export default async function CalendarPage() {
  const events = await getCalendarData();
  
  // Sort events by date
  const sortedEvents = events.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            📅 Content Calendar
          </h1>
          <p className="text-zinc-400">
            Plan and schedule your content, tasks, and activities
          </p>
        </div>
        
        {/* Calendar */}
        <CalendarView events={sortedEvents} />
        
        {/* Upcoming Events Sidebar */}
        <Card className="mt-6 bg-zinc-900/50 border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">📌 Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <div className="text-4xl mb-2">📅</div>
                <p>No upcoming events</p>
                <p className="text-sm mt-1">Schedule posts or add tasks to see them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.slice(0, 10).map(event => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition"
                  >
                    <div className="text-2xl flex-shrink-0">
                      {event.type === 'post' && '📝'}
                      {event.type === 'task' && '✅'}
                      {event.type === 'activity' && '📊'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-zinc-400 line-clamp-1 mt-1">
                          {event.description}
                        </div>
                      )}
                      {event.location && (
                        <div className="text-xs text-zinc-500 mt-1">
                          📍 {event.location}
                        </div>
                      )}
                      <div className="text-xs text-zinc-500 mt-1">
                        {format(event.date, 'MMM d, yyyy • h:mm a')}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          event.status === 'published' || event.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : event.status === 'scheduled'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedEvents.length > 10 && (
                  <div className="text-center text-zinc-500 text-sm pt-2">
                    +{sortedEvents.length - 10} more events
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}