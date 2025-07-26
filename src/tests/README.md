# People Metadata Plugin - Test Suite

This directory contains comprehensive tests for the People Metadata Plugin, covering core functionality, performance, and edge cases.

## 🧪 **Test Structure**

### **Working Tests**
- ✅ **core-functionality.test.ts** - Core model, ID generation, multi-company logic (18 tests)
- ✅ **consolidated-def-parser.test.ts** - File parsing functionality (existing)

### **Test Categories**

#### **1. Core Functionality Tests** ✅
- **PersonMetadata Model**: Object creation, validation, required/optional fields
- **ID Generation**: Consistent IDs, special characters, normalization, performance
- **DefFileType**: Enum validation and type checking
- **Color Parsing**: Valid/invalid inputs, error handling
- **Multi-Company Logic**: Duplicate detection, grouping, tab creation
- **Performance**: Large dataset handling, concurrent operations
- **Data Validation**: Field validation, edge cases

#### **2. Advanced Feature Tests** 🔄 (Planned)
- **mention-counting-service.test.ts** - Smart detection, real-time updates
- **optimized-search-engine.test.ts** - Performance optimization, caching
- **auto-completion.test.ts** - EditorSuggest functionality
- **settings.test.ts** - Configuration management
- **multi-company-support.test.ts** - Tab behavior, company styling

## 🚀 **Running Tests**

### **Basic Test Commands**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run with verbose output
npm run test:verbose

# Run for CI/CD
npm run test:ci

# Run specific test file
npm test -- --testPathPattern=core-functionality.test.ts
```

### **Test Configuration**
- **Framework**: Jest with TypeScript support
- **Coverage**: HTML, LCOV, and text reports
- **Threshold**: 30% coverage (will increase as more tests are added)
- **Environment**: Node.js with Obsidian mocks

## 📊 **Current Test Coverage**

### **Tested Components** ✅
- **Core Model** (model.ts): 100% coverage
- **File Types** (file-type.ts): 100% coverage  
- **Color Parsing** (company-colors.ts): 68% coverage
- **ID Generation**: Comprehensive test coverage
- **Multi-Company Logic**: Full business logic coverage

### **Components Needing Tests** 🔄
- **Mention Counting Service**: Smart detection algorithms
- **Optimized Search Engine**: Performance and caching
- **Auto-completion System**: EditorSuggest integration
- **Settings Management**: Configuration validation
- **Tooltip System**: Multi-company tabs and interactions

## 🎯 **Test Quality Standards**

### **Test Categories**
1. **Unit Tests**: Individual function/method testing
2. **Integration Tests**: Component interaction testing
3. **Performance Tests**: Large dataset and timing validation
4. **Edge Case Tests**: Error handling and boundary conditions

### **Test Patterns**
- **Arrange-Act-Assert**: Clear test structure
- **Descriptive Names**: Self-documenting test descriptions
- **Isolated Tests**: No dependencies between tests
- **Mock Usage**: Proper Obsidian API mocking

### **Coverage Goals**
- **Core Logic**: 90%+ coverage for business logic
- **Error Handling**: 80%+ coverage for error paths
- **Edge Cases**: 70%+ coverage for boundary conditions
- **Integration**: 60%+ coverage for component interactions

## 🛠️ **Test Utilities**

### **Global Test Utilities** (setup.ts)
- **Console Management**: Enable/disable console output
- **Test Data Generation**: Helper functions for creating test objects
- **Timing Utilities**: Delay functions for async testing
- **Custom Matchers**: Domain-specific assertions

### **Custom Matchers**
```typescript
expect(person).toHaveValidPersonMetadata();
expect(time).toBeWithinRange(100, 200);
```

### **Mock Objects**
- **Obsidian API**: Complete mocking of App, Vault, MetadataCache
- **File System**: TFile and file operation mocks
- **UI Components**: Modal, Setting, Notice mocks

## 📈 **Performance Testing**

### **Performance Benchmarks**
- **ID Generation**: <100ms for 1000 operations
- **Multi-Company Grouping**: <50ms for 100 people
- **Concurrent Operations**: <50ms for 100 parallel operations

### **Memory Testing**
- **Large Datasets**: 1000+ person objects
- **Concurrent Processing**: 100+ parallel operations
- **Memory Leaks**: Proper cleanup validation

## 🔍 **Debugging Tests**

### **Verbose Mode**
```bash
# Enable console output during tests
VERBOSE_TESTS=1 npm test
```

### **Individual Test Debugging**
```bash
# Run single test with full output
npm test -- --testPathPattern=core-functionality --verbose
```

### **Coverage Analysis**
```bash
# Generate detailed coverage report
npm run test:coverage
open coverage/index.html
```

## 🎯 **Future Test Expansion**

### **Priority 1: Core Features**
- **Mention Counting**: Smart detection algorithms
- **Search Engine**: Performance optimization testing
- **Auto-completion**: EditorSuggest integration

### **Priority 2: Advanced Features**
- **Settings**: Configuration validation and migration
- **UI Components**: Tooltip behavior and styling
- **File Operations**: Parser and updater testing

### **Priority 3: Integration**
- **End-to-End**: Full workflow testing
- **Performance**: Large vault simulation
- **Error Recovery**: Failure scenario testing

## 📝 **Contributing Tests**

### **Adding New Tests**
1. Create test file in `src/tests/` directory
2. Follow naming convention: `feature-name.test.ts`
3. Include comprehensive test categories
4. Add performance and edge case tests
5. Update this README with new test information

### **Test Requirements**
- **Descriptive Names**: Clear test descriptions
- **Comprehensive Coverage**: Happy path, error cases, edge cases
- **Performance Validation**: Timing assertions where appropriate
- **Mock Usage**: Proper isolation from external dependencies

The test suite provides a solid foundation for ensuring the reliability and performance of the People Metadata Plugin across all its features and use cases.
