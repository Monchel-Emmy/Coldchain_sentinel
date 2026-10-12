import docx
from docx.oxml import OxmlElement
import os
import re

template_path = r"BSc_CSE_Final Year Tamplate 2025-2026 (1).docx"
output_path = r"BSc_CSE_Final_Year_Thesis_ColdChain_Sentinel.docx"
markdown_path = r"thesis_chapters_4_5_6.md"

def insert_paragraph_after(paragraph, text, style=None):
    new_p = OxmlElement('w:p')
    paragraph._p.addnext(new_p)
    new_para = docx.text.paragraph.Paragraph(new_p, paragraph._parent)
    if text:
        new_para.text = text
    if style:
        new_para.style = style
    return new_para

def load_markdown_content(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple markdown parser to extract text grouped by headers
    sections = {}
    current_header = None
    current_paras = []
    
    lines = content.split('\n')
    for line in lines:
        stripped = line.strip()
        # Header match (e.g. # Chapter 4 or ## 4.1 Introduction or ### 4.2.1 System Architecture)
        header_match = re.match(r'^(#{1,3})\s+(.*)$', stripped)
        if header_match:
            if current_header:
                sections[current_header] = current_paras
            current_header = header_match.group(2).strip()
            current_paras = []
        else:
            if stripped:
                current_paras.append(line) # keep original line formatting
            elif current_paras and current_paras[-1] != "":
                current_paras.append("") # empty line spacing
                
    if current_header:
        sections[current_header] = current_paras
        
    return sections

def clean_heading_text(text):
    # Remove bracketed instructions like [at least 8 pages...]
    cleaned = re.sub(r'\s*\[[^\]]+\]', '', text)
    # Clean trailing spaces or dots
    return cleaned.strip()

def main():
    if not os.path.exists(template_path):
        print(f"Error: Template {template_path} not found.")
        return
    if not os.path.exists(markdown_path):
        print(f"Error: Markdown file {markdown_path} not found.")
        return
        
    print("Loading markdown chapters...")
    md_sections = load_markdown_content(markdown_path)
    
    print("Loading Word document template...")
    doc = docx.Document(template_path)
    
    # Define mapping from document paragraph keywords to MD section headers
    mappings = {
        r"CHAPTER 4:\s*DESIGN AND IMPLEMENTATION": "CHAPTER 4: DESIGN AND IMPLEMENTATION",
        r"4.1\s*INTRODUCTION": "4.1 INTRODUCTION",
        r"4.2\s*SYSTEM MODEL/ARCHITECTURE DESIGN": "4.2 SYSTEM MODEL/ARCHITECTURE DESIGN",
        r"4.2.1\s*SYSTEM ARCHITECTURE": "4.2.1 SYSTEM ARCHITECTURE",
        r"4.2.2\s*CLASS DIAGRAM": "4.2.2 CLASS DIAGRAM",
        r"4.2.3\s*DEPLOYMENT DIAGRAM": "4.2.3 DEPLOYMENT DIAGRAM",
        r"4.2.4\s*DATA FLOW DIAGRAM": "4.2.4 DATA FLOW DIAGRAM (DFD)",
        r"4.2.5\s*SEQUENCE DIAGRAM": "4.2.5 SEQUENCE DIAGRAM",
        r"4.2.6\s*API DESIGN": "4.2.6 API DESIGN",
        r"4.3\s*COMPARISON IN DESIGN": "4.3 COMPARATIVE MODEL DESIGN",
        r"CHAPTER 5:\s*DISCUSSION OF THE RESULTS": "CHAPTER 5: DISCUSSION OF THE RESULTS",
        r"5.1\s*DISCUSSIONS OF THE PARAMETERS": "5.1 DISCUSSIONS OF THE PARAMETERS USED AND THEIR UNITS",
        r"5.2\s*DISCUSSION OF RESULTANT TABLES": "5.2 DISCUSSION OF RESULTANT TABLES, GRAPHS, FIGURES, AND DIAGRAMS OF THE PROPOSED SYSTEM",
        r"5.2.1\s*Data Preprocessing": "5.2.1 Data Preprocessing",
        r"5.2.3\s*Training and Validation Accuracy": "Prediction Model Results (LSTM)",
        r"5.2.4\s*Training and Validation Loss": None,  # We can skip or insert placeholders
        r"5.2.5\s*Comparison Table": "Table 10 Model Performance Comparison",
        r"5.3\s*DISCUSSION OF OVERALL OUTCOMES": "5.3 OVERALL OUTCOMES/OUTPUTS/RESULTS",
        r"5.4\s*A SUMMARY OF THE PROPOSED PRODUCT": "5.4 SUMMARY OF THE PROPOSED PRODUCT",
        r"CHAPTER 6:\s*CONCLUSION AND RECOMMENDATION": "CHAPTER 6: CONCLUSION AND RECOMMENDATION",
        r"6.1\s*CONCLUSION": "6.1 CONCLUSION", # matches under Ch6
        r"6.2\s*RECOMMENDATION": "6.2 RECOMMENDATION AND FUTURE WORK",
    }
    
    # We will search for these headers in the document paragraphs
    print("Injecting thesis chapters...")
    
    i = 0
    while i < len(doc.paragraphs):
        p = doc.paragraphs[i]
        p_text = p.text.strip()
        
        matched_key = None
        for pattern in mappings:
            if re.search(pattern, p_text, re.IGNORECASE):
                matched_key = pattern
                break
                
        if matched_key:
            md_header = mappings[matched_key]
            print(f"Matched heading: '{p_text}' -> MD: '{md_header}'")
            
            # Clean heading text
            p.text = clean_heading_text(p_text)
            
            if md_header and md_header in md_sections:
                paras_to_insert = md_sections[md_header]
                current_p = p
                for text in paras_to_insert:
                    # Filter out empty strings that are duplicated
                    if text == "" and current_p.text == "":
                        continue
                    current_p = insert_paragraph_after(current_p, text)
                    
                # Skip the newly inserted paragraphs to prevent double processing
                # (each insertion adds a paragraph to doc.paragraphs)
                # We can just let it continue searching since it won't match the triggers
            
            # If the header was just a template placeholder to be cleaned
            elif not md_header:
                p.text = "" # Clear it
                
        i += 1
        
    print(f"Saving compiled document to: {output_path}")
    doc.save(output_path)
    print("Done!")

if __name__ == "__main__":
    main()
