import google.generativeai as genai
genai.configure(api_key="AIzaSyCNBDbjYGTQ5pj7iObN0fIxavBeZr3mRww")
print(list(genai.list_models()))
