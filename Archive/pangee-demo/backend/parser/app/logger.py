import pandas as pd, logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ConversationLogger:
    def __init__(self):
        self.rows = []
        self.columns = ["Timestamp","Role","Message","Enabled Keywords",
                        "Disabled Keywords","Sources","Evaluation","SimilarityScore"]

    def add(self, role, message, enabled, disabled, sources, evaluation="", similarity_score=None):
        self.rows.append({
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Role": role,
            "Message": message,
            "Enabled Keywords": ", ".join(enabled) if enabled else "",
            "Disabled Keywords": ", ".join(disabled) if disabled else "",
            "Sources": "; ".join(sources) if sources else "",
            "Evaluation": evaluation,
            "SimilarityScore": similarity_score if similarity_score is not None else ""
        })

    def export(self, path="conversation_log.xlsx"):
        pd.DataFrame(self.rows, columns=self.columns).to_excel(path, index=False)
        logger.info(f"Conversation log saved to {path}")
