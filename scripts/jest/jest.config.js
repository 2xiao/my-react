const { defaults } = require('jest-config');

module.exports = {
    ...defaults,
    rootDir: process.cwd(),
    // 寻找测试用例忽略的文件夹
    modulePathIgnorePatterns: ['<rootDir>/.history'],
    // 依赖包的解析地址
    moduleDirectories: [
        // React 和 ReactDOM 包的地址
        'dist/node_modules',
        // 第三方依赖的地址 
        ...defaults.moduleDirectories
    ],
    testEnvironment: 'jsdom',
}