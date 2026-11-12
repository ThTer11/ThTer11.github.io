import { Navigate, useParams } from "react-router-dom";
import { useLang } from "../App";
import { getExerciseCategory } from "../exercises/registry";
import { practiceHref } from "../practice/catalog";

export default function ExerciseCategory() {
  const { categoryId } = useParams();
  const { lang } = useLang();
  return <Navigate replace to={practiceHref(lang, getExerciseCategory(categoryId) ? categoryId : undefined)} />;
}
