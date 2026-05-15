import pandas as pd
import pickle

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Load dataset
df = pd.read_csv("complaints_dataset.csv")

X = df["text"]
y_category = df["category"]
y_priority = df["priority"]

# Convert text to numbers
vectorizer = TfidfVectorizer()
X_vectorized = vectorizer.fit_transform(X)

# Category model
category_model = LogisticRegression()
category_model.fit(X_vectorized, y_category)

# Priority model
priority_model = LogisticRegression()
priority_model.fit(X_vectorized, y_priority)

# Save vectorizer
with open("../weights/vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

# Save category model
with open("../weights/classifier.pkl", "wb") as f:
    pickle.dump(category_model, f)

# Save priority model
with open("../weights/priority_classifier.pkl", "wb") as f:
    pickle.dump(priority_model, f)

print("Training complete. Category and priority models saved.")