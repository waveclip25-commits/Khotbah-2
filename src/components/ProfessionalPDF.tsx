import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register Fonts with more stable URLs
// We only register Amiri. Standard fonts like Helvetica are built-in.
Font.register({
  family: 'Amiri',
  src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf'
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 45,
    paddingBottom: 65,
    paddingHorizontal: 55,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  coverPage: {
    height: '100%',
    width: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  coverImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Slightly lighten the image for text readability
  },
  coverContent: {
    width: '80%',
    textAlign: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  coverBorder: {
    position: 'absolute',
    top: 30,
    bottom: 30,
    left: 30,
    right: 30,
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'solid',
    borderRadius: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Oblique',
    textAlign: 'center',
    marginBottom: 30,
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  authorInfo: {
    marginTop: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
    width: '100%',
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  locationDate: {
    fontSize: 10,
    color: '#64748b',
  },
  tocPage: {
    padding: 60,
    backgroundColor: '#f8fafc',
  },
  tocTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 30,
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#10b981',
    paddingBottom: 10,
  },
  tocItem: {
    fontSize: 12,
    marginBottom: 12,
    color: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tocDot: {
    width: 6,
    height: 6,
    backgroundColor: '#10b981',
    borderRadius: 3,
    marginRight: 15,
  },
  section: {
    marginBottom: 20,
  },
  heading1: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
    marginTop: 24,
    color: '#0f172a',
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 6,
  },
  heading2: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    marginTop: 18,
    color: '#1e293b',
  },
  heading3: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 14,
    color: '#334155',
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
  },
  arabicBlock: {
    fontFamily: 'Amiri',
    fontSize: 24,
    textAlign: 'center', // Center looks much better for Quranic verses in print
    backgroundColor: '#f8fafc',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    marginTop: 8,
    color: '#0f172a',
    lineHeight: 2,
  },
  translation: {
    fontSize: 11,
    fontFamily: 'Helvetica-Oblique',
    color: '#475569',
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 10,
  },
  bullet: {
    width: 20,
    fontSize: 14,
    color: '#10b981',
  },
  listNumber: {
    width: 25,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#10b981',
  },
  listItemText: {
    flex: 1,
    lineHeight: 1.6,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 55,
    right: 55,
    fontSize: 9,
    textAlign: 'center',
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 55,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  }
});

interface ProfessionalPDFProps {
  title: string;
  content: string;
  author?: string;
  location?: string;
  date?: string;
  coverData?: any;
}

export const ProfessionalPDF = ({ title, content, author, location, date, coverData }: ProfessionalPDFProps) => {
  
  // Helper to render bold and italic styles inline
  const renderInlineStyles = (text: string) => {
    // Regex splits the string by bold, italic, or custom manual markers
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[TEKAN\].*?\[\/TEKAN\]|\[STRIP\].*?\[\/STRIP\]|\[DOUBLE\].*?\[\/DOUBLE\]|\[STABILO\].*?\[\/STABILO\]|\[THIN\].*?\[\/THIN\]|\[BOX\].*?\[\/BOX\])/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={i} style={{ fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>{part.slice(2, -2)}</Text>;
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <Text key={i} style={{ fontFamily: 'Helvetica-Oblique' }}>{part.slice(1, -1)}</Text>;
      } else if (part.startsWith('[TEKAN]') && part.endsWith('[/TEKAN]')) {
        return <Text key={i} style={{ backgroundColor: '#fef08a', color: '#713f12', paddingHorizontal: 2 }}>{part.slice(7, -8)}</Text>;
      } else if (part.startsWith('[STRIP]') && part.endsWith('[/STRIP]')) {
        return <Text key={i} style={{ textDecoration: 'underline' }}>{part.slice(7, -8)}</Text>;
      } else if (part.startsWith('[DOUBLE]') && part.endsWith('[/DOUBLE]')) {
        return <Text key={i} style={{ textDecoration: 'underline', fontFamily: 'Helvetica-Bold' }}>{part.slice(8, -9)}</Text>; // Simulating double with bold underline
      } else if (part.startsWith('[STABILO]') && part.endsWith('[/STABILO]')) {
        return <Text key={i} style={{ backgroundColor: '#fff9c4' }}>{part.slice(9, -10)}</Text>;
      } else if (part.startsWith('[THIN]') && part.endsWith('[/THIN]')) {
        return <Text key={i} style={{ opacity: 0.6, fontFamily: 'Helvetica-Oblique' }}>{part.slice(6, -7)}</Text>;
      } else if (part.startsWith('[BOX]') && part.endsWith('[/BOX]')) {
        return <Text key={i} style={{ borderBottomWidth: 1, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#fb7185', paddingHorizontal: 2 }}>{part.slice(5, -6)}</Text>;
      }
      return part;
    });
  };

  // Simple Markdown to PDF mapping
  const parseContent = (text: string) => {
    if (!text) return [];
    
    const cleanText = text.replace(/\r\n/g, '\n');
    const lines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];
    let currentArabicBlock = '';
    let isInsideArabic = false;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Handle Arabic Blocks
      if (trimmedLine.startsWith('```arabic')) {
        isInsideArabic = true;
        currentArabicBlock = '';
        return;
      }

      if (trimmedLine === '```' && isInsideArabic) {
        isInsideArabic = false;
        const arabicText = currentArabicBlock.trim();
        if (arabicText) {
          elements.push(
            <Text key={`arabic-${index}`} style={styles.arabicBlock}>
              {arabicText}
            </Text>
          );
        }
        return;
      }

      if (isInsideArabic) {
        currentArabicBlock += line + '\n';
        return;
      }

      // Handle Empty Lines
      if (!trimmedLine) {
        elements.push(<View key={`empty-${index}`} style={{ height: 10 }} />);
        return;
      }

      // Handle Headers
      if (trimmedLine.startsWith('# ')) {
        const h1Text = trimmedLine.replace('# ', '').trim();
        if (h1Text) elements.push(<Text key={index} style={styles.heading1}>{renderInlineStyles(h1Text)}</Text>);
      } else if (trimmedLine.startsWith('## ')) {
        const h2Text = trimmedLine.replace('## ', '').trim();
        if (h2Text) elements.push(<Text key={index} style={styles.heading2}>{renderInlineStyles(h2Text)}</Text>);
      } else if (trimmedLine.startsWith('### ')) {
        const h3Text = trimmedLine.replace('### ', '').trim();
        if (h3Text) elements.push(<Text key={index} style={styles.heading3}>{renderInlineStyles(h3Text)}</Text>);
      } 
      // Handle Blockquotes (often used for translations or quotes)
      else if (trimmedLine.startsWith('> ')) {
        const quoteText = trimmedLine.replace('> ', '').trim();
        if (quoteText) elements.push(<Text key={index} style={styles.translation}>{renderInlineStyles(quoteText)}</Text>);
      } 
      // Handle Horizontal Rules
      else if (trimmedLine === '---') {
        elements.push(<View key={index} style={{ marginVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }} />);
      } 
      // Handle Unordered Lists (- or *)
      else if (trimmedLine.match(/^[-*]\s/)) {
        const itemText = trimmedLine.substring(2);
        elements.push(
          <View key={index} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listItemText}>{renderInlineStyles(itemText)}</Text>
          </View>
        );
      }
      // Handle Ordered Lists (1., 2., 3.)
      else if (trimmedLine.match(/^\d+\.\s/)) {
        const match = trimmedLine.match(/^(\d+\.)\s/);
        const prefix = match ? match[1] : '1.';
        const itemText = trimmedLine.substring(prefix.length + 1);
        elements.push(
          <View key={index} style={styles.listItem}>
            <Text style={styles.listNumber}>{prefix}</Text>
            <Text style={styles.listItemText}>{renderInlineStyles(itemText)}</Text>
          </View>
        );
      }
      // Handle Regular Paragraphs
      else {
        const isTranslation = trimmedLine.startsWith('Artinya:') || trimmedLine.startsWith('Terjemahan:');
        
        elements.push(
          <Text 
            key={index} 
            style={isTranslation ? styles.translation : styles.paragraph}
          >
            {renderInlineStyles(trimmedLine)}
          </Text>
        );
      }
    });

    return elements;
  };

  return (
    <Document title={title} author={author || 'Mimbar AI'}>
      {/* Cover Page */}
      {coverData?.show && (
        <Page size="A4" style={styles.coverPage}>
          <View style={styles.coverBorder} />
          
          {coverData.imageUrl && (
            <View style={styles.coverImageContainer}>
              <Image 
                src={coverData.imageUrl} 
                style={[
                  styles.coverImage,
                  {
                    transform: `scale(${coverData.imageScale || 1}) translate(${coverData.imageOffsetX || 0}px, ${coverData.imageOffsetY || 0}px)`
                  }
                ]} 
              />
              <View style={styles.coverOverlay} />
            </View>
          )}

          <View style={styles.coverContent}>
            <Text style={styles.title}>{coverData.title || title}</Text>
            {coverData.subtitle && <Text style={styles.subtitle}>{coverData.subtitle}</Text>}
            
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{coverData.author || author}</Text>
              {(coverData.location || coverData.date) && (
                <Text style={styles.locationDate}>
                  {[coverData.location || location, coverData.date || date].filter(Boolean).join(' | ')}
                </Text>
              )}
            </View>
          </View>
        </Page>
      )}

      {/* Table of Contents */}
      {coverData?.show && coverData?.toc && (
        <Page size="A4" style={styles.tocPage}>
          <Text style={styles.tocTitle}>Daftar Isi</Text>
          <View style={{ marginTop: 20 }}>
            {coverData.toc.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
              <View key={i} style={styles.tocItem}>
                <View style={styles.tocDot} />
                <Text>{line.trim()}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* Main Content Pages */}
      <Page size="A4" style={styles.page}>
        <View>{parseContent(content)}</View>
        
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Halaman ${pageNumber} dari ${totalPages} | ${title}`
        )} fixed />
      </Page>
    </Document>
  );
};
