import { createClient } from "../../lib/supabase/server";

export async function getQuestion(questionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gmb_questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (error) throw error;
  return data;
}

export async function getAutoAnswerSettings(
  userId: string,
  locationId: string,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auto_reply_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .single();

  if (error) throw error;
  return data;
}

export async function saveQuestion(
  question: Record<string, unknown>,
  locationId: string,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gmb_questions")
    .insert([
      {
        question_id: question.question_id,
        location_id: locationId,
        question_text: question.text,
        author_display_name: question.author_display_name,
        create_time: question.create_time,
        update_time: question.update_time,
        top_answers: question.top_answers,
        total_answer_count: question.total_answer_count,
        upvote_count: question.upvote_count,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUnansweredQuestions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gmb_questions")
    .select("*")
    .is("answer_text", null);

  if (error) throw error;
  return data;
}

export async function updateAutoAnswerSettings(
  userId: string,
  locationId: string,
  updates: Partial<any>,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auto_reply_settings")
    .update(updates)
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .single();

  if (error) throw error;
  return data;
}

export async function getBusinessInfo(locationId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gmb_locations")
    .select("*")
    .eq("id", locationId)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Business info not found");
  return data;
}
