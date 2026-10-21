import { useCallback, useEffect, useState } from "react";
import api from "../api";

function useAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/analysis/");
      setAnalysis(response.data);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Tidak dapat memuat analisis. Pastikan backend berjalan.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { analysis, loading, error, refresh };
}

export default useAnalysis;
